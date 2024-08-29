// @ts-nocheck
import { writable } from "svelte/store";



  export const planParams = writable({
    plan: '',
    recurring: false 
  });