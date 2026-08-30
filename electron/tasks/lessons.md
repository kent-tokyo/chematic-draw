# 開発セッション 教訓メモ（Electron版）

作成: 2026-08-30（2026-08-29〜08-30 の信頼性向上ラウンドを踏まえて）

ネイティブ版の `tasks/lessons.md`（gitignore対象・削除済み）の後継。内容は Electron/React/TypeScript/Zustand 構成に固有のもの。

---

## 1. テストは「状態」ではなく「実際に画面/ピクセルに出ているもの」を検証する

**繰り返し発生したパターン**: あるテストが「設定ファイルの中身」「派生ラベル文字列」「アプリケーション状態」だけを検証して green になった一方、実際にユーザーが見る画面はずっと壊れていた。

具体例:
- Recent Files機能: `settings.json` への永続化テストは通っていたが、実際のメニューの Recent Files サブメニューは Electron の `MenuItem.submenu` が read-only であるため一度も更新されたことがなかった（`fileMenu.submenu.items[idx].submenu = ...` が例外を投げ、IPC ハンドラの try/catch に静かに握りつぶされていた）。
- ウィンドウリサイズ後の分子消失: `aria-label`（原子数・結合数）は正しいままだったが、`<canvas>` の `width`/`height` 属性への代入が描画バッファを暗黙にクリアし、それを再描画する副作用のトリガーが無かった。実際に `getImageData()` でピクセルを読むテストでしか検出できなかった。
- Undo/Redo/Copy/Paste メニュー: Electron の `role: 'undo'` 等は `click` を無視するため、メニューをクリックしても何も起きない状態が長く放置されていた。IPCイベントを直接送るテストで初めて可視化された。

**教訓**: 「値が正しい」ことと「画面に正しく反映されている」ことは別の主張であり、後者を検証しないテストは容易に見せかけの green を作る。特に Canvas 2D 描画・Electron ネイティブメニュー・IPC 経由の副作用は、状態のみのアサーションでは検出できない。

---

## 2. Zustand アクションと値の区別（React Hooks 依存配列）

**問題**: `useEffect`/`useCallback` の依存配列から Zustand ストアの関数（`set`/`get` ベースのアクション）を省いても実害はない（毎レンダー同一の参照で安定しており、呼び出し時に常に最新の state を `get()` で読むため）。しかし ESLint の `react-hooks/exhaustive-deps` はこれを区別できず、どちらも同じ警告として出す。

**実際に起きたバグ**: `useKeyboard.ts` のキーボードリスナー登録 `useEffect` が `[]` （空配列）で、`molecule`・`zoom`・`focusMode` という**値**をクロージャに固定してしまっていた。この結果、Ctrl+C は常に起動時点の分子をコピーし続け、ズームは複合計算されず、Ctrl+Shift+F はONにしかならなかった。この不具合は `react-hooks/exhaustive-deps` の警告として最初から出ていたが、「同じ警告数だから問題なし」という運用で見過ごされていた。

**教訓**:
- lint の警告「件数」を diff の合否判定に使うのは正しいが、それ自体を「調査済み」の証拠にしてはいけない。件数が同じでも、その中身を定期的に読み直す必要がある。
- さらに、`eslint-disable-next-line` で個別に抑制された警告は警告リストにすら出てこない。`grep -rn "eslint-disable.*exhaustive-deps"` で個別に洗い出す必要がある。
- 依存配列の警告を見たら、指摘されている識別子が「Zustandのアクション（安全）」か「プレーンな state 値（危険）」かをまず区別する。

---

## 3. Electron `Menu` / ネイティブAPIの落とし穴

- **`MenuItem.submenu` は一度 `Menu.buildFromTemplate()` されると read-only**。動的に変更する唯一の方法は `Menu.setApplicationMenu()` によるテンプレート全体の再構築。
- **`role:` を指定すると `click` は完全に無視される**。`role: 'undo'`/`'redo'`/`'copy'`/`'paste'` はブラウザ標準の `execCommand` 相当の動作（`webContents.undo()` 等）を行うが、これは DOM の contenteditable 相手の話であり、`<canvas>` ベースのアプリでは実質何もしない完全な no-op になる。
- **アプリ独自のキーボードショートカットと同じキーの `accelerator` をメニューに登録すると危険**。ネイティブメニューのアクセラレータが該当キー入力を横取りするかどうか（レンダラーの `keydown` にも届くかどうか）はプラットフォーム/Electronバージョン依存で、Playwrightのキー入力シミュレーションはOSレベルのアクセラレータ経由を通らないため CDP からは判別不能。**両方が発火した場合の二重実行（例: 二重Undo）を作り込むリスクがあるため、既にレンダラー側で処理されているキーには `accelerator` を付けない**のが安全側の解。メニュー項目自体は動くようにしつつ、キーボードはレンダラー側リスナーに任せる。
- **`app.whenReady()` 起動チェーンで同期的に投げられた例外は、`.catch()` が無いと完全に無言で失敗する**。`Menu.setApplicationMenu()` に到達せず、Electronの既定メニュー（ラベルが違う・カスタム項目が全部消える）にフォールバックする。
- **ユーザーが書き込める設定ファイル（`settings.json` 等）はシングルユーザーのデスクトップアプリであっても信頼境界そのもの**。手動編集・破損・旧バージョンのバグによる不正値を常に想定してバリデーションする。

---

## 4. Electron の一部APIは「ドキュメント通りに同期」とは限らない

**発見**: `clipboard.readText()` は Electron の公式ドキュメント上は同期関数で文字列を返す。しかし今回のビルド/プラットフォームで実際に呼び出すと `Promise` オブジェクトを返した（`constructor.name === 'Promise'` を実機で確認）。

`ipcMain.handle('clipboard:read', async () => { const text = clipboard.readText(); return {success:true, content:text}; })` のように `await` せずにそのまま IPC レスポンスへ埋め込むと、Electron の structured-clone シリアライズが `Promise` を送れずに失敗する（"An object could not be cloned"）。しかもこのエラーはハンドラの `try/catch` の**外側**、ハンドラが値を返した**後**に発生するため、呼び出し元の `ipcRenderer.invoke()` はエラーも出さず永遠にハングする。

**教訓**:
- 「ドキュメントが同期と言っている」を鵜呑みにせず、怪しい挙動が出たら `typeof`/`constructor.name` を実機ログで確認する。
- 疑わしい Electron API 呼び出しは常に `await` しておく（値が本当に同期でも `await` は無害）。
- IPC ハンドラのレスポンスに、確実にプレーンなシリアライズ可能な値（文字列・数値・プレーンオブジェクト）だけが入るよう、呼び出しの戻り値の型を疑ってかかる。

---

## 5. Undo/Redo 設計時に確認すべきこと

- `pushUndo()` は**変異の直前**に呼ぶ。直後に呼ぶと1回余分にUndoが必要になる。
- **同じインタラクションの兄弟パス**（例: 「新規原子追加」と「既存原子をクリックして元素変更」）で片方だけ `pushUndo()` が呼ばれていないケースがあった。1つのツール/ハンドラ内の全分岐を確認する。
- **ドラッグ操作は「開始した瞬間」に1回だけ** `pushUndo()` を呼ぶ。`mousemove` ごとに呼ぶとUndoスタックが毎フレーム分積み上がり実質使い物にならない。ただし「本当にドラッグが始まった瞬間」の判定（クリックとの閾値）を誤ると、`pushUndo()` の対象スナップショットが数ピクセルずれた位置になる、という別の罠がある。
- **`pushUndo()` が早すぎる位置にあっても実害がないことがある**（例: `mousedown` 時点で毎回呼んでおき、実際に変異が起きなくても no-op のスナップショットが積まれるだけ）。これは「機能しない」バグより軽微だが、余分な Undo スタックエントリを生む。
- 網羅性を確認するときは、変異系アクション（`addAtom`/`updateAtom`/`removeAtom`/`addBond`/`updateBond`/`removeBond`/`setMolecule`）の**全呼び出し箇所**を `grep` で洗い出し、それぞれの直前に `pushUndo()` があるかを1つずつ確認する。片方向（「`pushUndo()` の呼び出し一覧」から辿る）だけでは、呼び出しが漏れている箇所を見逃す。
