{
  "extends": "./.nuxt/tsconfig.node.json",
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "esModuleInterop": true
  },
  "ts-node": {
    "esm": true,
    "experimentalSpecifierResolution": "node"
  },
  "include": [
    "app/scripts/**/*.ts",
    "app/assets/utils/**/*.ts",
    "shared/types/**/*.ts"
  ]
}