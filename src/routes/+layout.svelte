<script>
	// @ts-nocheck

	import '../app.css';
	import { onMount } from 'svelte';
	import { auth } from '../lib/firebase/firebase.client';
	import { authStore } from '../store/authStore';
	import { browser } from '$app/environment';

	onMount(() => {
		const unsubscribe = auth.onAuthStateChanged((user) => {
			console.log(user);
			authStore.update((curr) => {
				return { ...curr, isLoading: false, currentUser: user };
			});
			if (browser && !$authStore.currentUser && !$authStore.isLoading && window.location.pathname !== "/") {
				window.location.href = '/';
			}
      if (browser && $authStore.currentUser && !$authStore.isLoading && window.location.pathname === "/") {
				window.location.href = '/dashboard';
			}
		});
		return unsubscribe;
	});
</script>

<slot />
