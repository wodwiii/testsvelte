<script>
	// @ts-nocheck

	import { authHandlers, authStore, subscription, fetchSubscription } from '../../store/authStore';
	import {paymentIntentId} from '../../store/paymentStore';
	import { getSubscription } from '../../lib/firebase/subscription';
	import { onMount, tick } from 'svelte';
	import UpgradeModal from '../../components/UpgradeModal.svelte';
	import PaymentModal from '../../components/PaymentModal.svelte';
	import ManageModal from '../../components/ManageModal.svelte';
	let subscriptionData;
	let email;
	let uid;
	let showModal = false;
    let showPaymentModal = false;
	let showManageModal = false;

	authStore.subscribe(async (curr) => {
		email = curr?.currentUser?.email;
		uid = curr?.currentUser?.uid;
		if (curr.currentUser) {
			await fetchSubscription();
			subscriptionData = $subscription;
		}
	});
	const handleUpgrade = () => {
        showPaymentModal = true;
    };

    const handlePaymentSuccess = async() => {
		
    };

    const closeModal = () => {
        showModal = false;
        showPaymentModal = false;
		showManageModal = false;
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
		<div class="text-sm font-normal text-black">
			<p>Plan: <span class="font-bold underline">{subscriptionData?.plan || "Loading..."}</span></p>
			{#if subscriptionData?.status === "active"}
				<p>Next Renewal: <span class="font-bold underline">{subscriptionData?.next_billing_schedule || "Loading..."}</span></p>
			{:else if subscriptionData?.status === "cancelled"}
				<p>Expiration: <span class="font-bold underline">{subscriptionData?.next_billing_schedule || "Loading..."}</span></p>
			{:else}
				<p><span class="font-bold underline">Forever</span></p>
			{/if}
		</div>
		<div class="mt-4">
			<button
				on:click={() => (showModal = true)}
				class="bg-[#fe0000] text-white text-sm font-bold py-2 px-4 rounded-lg hover:bg-[#a60505] w-[130px]"
			>
				Upgrade Plan
			</button>
		</div>
		<div class="mt-4">
			<button
				on:click={() => (showManageModal = true)}
				class="bg-[#fe0000] text-white text-sm font-bold py-2 px-4 rounded-lg hover:bg-[#a60505] w-[130px]"
			>
				Manage Plan
			</button>
		</div>
		<div class="mt-4">
			<button
				on:click={authHandlers.logout}
				class="bg-[#fe0000] text-white text-sm font-bold py-2 px-4 rounded-lg hover:bg-[#a60505] w-[130px]"
			>
				Logout
			</button>
		</div>
	</div>
</div>

<ManageModal showManageModal={showManageModal} closeModal={closeModal} uid={uid}/>
<UpgradeModal showModal={showModal} closeModal={closeModal} onUpgrade={handleUpgrade} />
<PaymentModal showPaymentModal={showPaymentModal} closeModal={closeModal} onPaymentSuccess={handlePaymentSuccess} />

