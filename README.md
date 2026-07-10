# Google Cloud RoleUp

Google Cloud IAM のロールとパーミッションを「探す・見る・比べる」ための静的 SPA。

- あるロールに特定のパーミッションが含まれるかを即答する
- パーミッションから、それを含むロールを最小権限順に逆引きする
- ロール同士の差分 (失う / 変わらず / 得る) を危険パーミッションのバッジつきで見る
- スーパーセット / サブセット / 類似 / 補完の関連ロールを探索する

検索・選択の状態はすべて URL に載るため、ブックマーク・共有ができます。

設計の背景は [iam-role-explorer-plan.md](iam-role-explorer-plan.md) を参照。

## 開発

```bash
npm install
npm run dev       # 開発サーバ
npm run build     # プロダクションビルド
npm run typecheck # 型チェック
npm run check     # lint + format (auto-fix)
```

## データ更新

`public/data/roleup.json` は IAM API から生成した静的データ (ロール / パーミッション / 関連ロールの前計算)。

```bash
# 要 gcloud ログイン。パーミッションの説明文の取得には
# gcloud のデフォルトプロジェクトを使用する (未設定なら skip)
npm run generate-data
```

生成時に前回ファイルと比較し、件数が 10% 以上減っていれば異常として fail します。

## 技術スタック

React Router v8 (SPA mode) / React 19 / TypeScript / Tailwind CSS v4 / Vite / Biome。
GitHub Pages へのデプロイは `.github/workflows/deploy-pages.yml` で main への push 時に行われます。

## License

MIT
