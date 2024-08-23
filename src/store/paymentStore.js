// @ts-nocheck
import { writable } from "svelte/store";

export const paymentStore = writable({
    intendID: null,
    paymentMethodID: null,
});

export const