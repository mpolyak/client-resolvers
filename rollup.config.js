const resolve = require("rollup-plugin-node-resolve");
const commonjs = require("rollup-plugin-commonjs");
const babel = require("rollup-plugin-babel");

module.exports = {
    input: "src/index.js",
    output: {
        name: "ClientResolvers",
        file: "lib/index.js",
        format: "umd",
        globals: {
            "react": "React",
        },
    },
    plugins: [
        resolve(),
        commonjs(),
        babel({
            presets: [
                [
                    "es2015", {
                        "modules": false,
                    },
                ],
            ],
            babelrc: false,
            exclude: "node_modules/**",
        }),
    ],
    external: [
        "react",
    ],
};