// See https://kit.svelte.dev/docs/types#app
declare global {
  namespace App {
    interface Locals {
      user: {
        uid: string;
        displayName: string;
        email: string;
        photoURL: string | null;
      } | null;
      isAdmin: boolean;
    }
  }
}

export {};
