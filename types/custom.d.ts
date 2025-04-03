// Custom type declarations

// Other internal custom type declarations can be added here
// No need to redeclare modules that are already declared in external-modules.d.ts

// Extend compromise with additional interfaces
declare module 'compromise' {
  interface Three {
    paragraphs(): any;
    dates(): any;
  }
}