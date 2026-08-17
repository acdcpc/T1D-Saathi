// Type declarations for the pre-bundled ESM build of @tensorflow/tfjs-tflite.
// The package's `module` entry (dist/index.js) is broken for Metro (it re-exports
// task-library clients that import a file only present under wasm/), so the web
// classifier deep-imports dist/tf-tflite.fesm.js instead. Re-export the same
// public types so the deep import stays typed.
declare module '@tensorflow/tfjs-tflite/dist/tf-tflite.fesm.js' {
  export * from '@tensorflow/tfjs-tflite';
}
