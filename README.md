# babel-plugin-schema

This module ships with 2 components:

1. When used with babel in a monorepo, it copies the @sprucelabs/spruce-schema module to the `node_modules` of the packages that need it so each project can utilize it's local path aliases.
2. A `resolve-path-aliases` command that can resolve path aliases configured in your projects `tsconfig.json`.

## Installing

```bash
yarn add @sprucelabs/babel-plugin-schema
```

## Adding to Babel config in monorepo

Add `@sprucelabs/babel-plugin-schema` with the options exactly as is:

```js
[
	"@sprucelabs/babel-plugin-schema",
	{ cwd: __dirname, destination: process.env.PWD },
];
```

### Babel config example

```js
module.exports = (api) => {
	api.cache(true);
	return {
		sourceMaps: true,
		presets: ["@babel/preset-env", "@babel/preset-typescript"],
		plugins: [
			[
				"@sprucelabs/babel-plugin-schema",
				{
					cwd: __dirname,
					destination: process.env.PWD,
				},
			],
			"@babel/plugin-transform-runtime",
			[
				"@babel/plugin-proposal-decorators",
				{
					legacy: true,
				},
			],
			["@babel/plugin-proposal-class-properties", { loose: true }],
			[
				"module-resolver",
				{
					root: ["./"],
					alias: {
						"#spruce": "./src/.spruce",
					},
				},
			],
		],
	};
};
```

## Resolving path aliases
