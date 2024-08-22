<script>
	// @ts-nocheck

	import { authHandlers, authStore, subscription, fetchSubscription } from '../../store/authStore';
	import { getSubscription } from '../../lib/firebase/subscription.client';
	import { onMount, tick } from 'svelte';
	import UpgradePlanModal from '../../components/PlanModal.svelte';
	let subscriptionData;
	let email;
	let showModal = false;
	authStore.subscribe(async (curr) => {
		email = curr?.currentUser?.email;
		if (curr.currentUser) {
			await fetchSubscription();
			subscriptionData = $subscription;
		}
	});
	const closeModal = () => {
		showModal = false;
	};
</script>

<div class="min-h-[100vh] text-center">
	<div class="font-bold text-3xl text-[#fe0000] text-center py-10">Dashboard</div>
	<div class="flex flex-col content-center">
		{#if $authStore.currentUser}
			<div class="">
				Welcome, <span class="underline font-bold">{email}</span>
			</div>
		{:else}
			<div>Loading...</div>
		{/if}
		<div class="mt-8 text-[#fe0000] font-bold text-xl">
			Subscription:
            <div class="text-sm font-normal text-black">
                <p>Plan: <span class="font-bold">{subscriptionData?.plan}</span></p>
                <p>Expiration: <span class="font-bold">{subscriptionData?.expires}</span></p>
            </div>
		</div>
		<div class="mt-4">
			<button
				on:click={() => (showModal = true)}
				class="bg-[#fe0000] text-white text-sm font-bold py-2 px-4 rounded-lg hover:bg-[#a60505]"
			>
				Upgrade Plan
			</button>
		</div>
		<div class="mt-4">
			<button
				on:click={authHandlers.logout}
				class="bg-[#fe0000] text-white text-sm font-bold py-2 px-4 rounded-lg hover:bg-[#a60505]"
			>
				Logout
			</button>
		</div>
	</div>
</div>

<UpgradePlanModal showModal={showModal} closeModal={closeModal} />
