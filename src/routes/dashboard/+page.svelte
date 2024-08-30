<script>
	// @ts-nocheck

	import { authHandlers, authStore, subscription, fetchSubscription } from '../../store/authStore';
	import { onMount } from 'svelte';
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
			console.log(subscriptionData);
		}
	});

	const handleUpgrade = () => {
        showPaymentModal = true;
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
			<p>Plan: <span class="font-bold underline">{subscriptionData?.subscriptionPlan || "Loading..."}</span></p>
			{#if subscriptionData?.status === "active"}
				<p>Next Renewal: <span class="font-bold underline">{subscriptionData?.renewalDate || "Loading..."}</span></p>
			{:else if subscriptionData?.status.includes("cancelled")}
				<p>Expiration: <span class="font-bold underline">{subscriptionData?.renewalDate || "Loading..."}</span></p>
			{/if}
		</div>
		{#if subscriptionData?.subscriptionPlan === "FREE"}
		<div class="mt-4">
			<button
			
				on:click={() => (showModal = true)}
				class="bg-[#fe0000] text-white text-sm font-bold py-2 px-4 rounded-lg hover:bg-[#a60505] w-[130px]"
			>
				Upgrade Plan
			</button>
		</div>
		{/if}
		<div class="mt-4">
			<button
				on:click={() => (showManageModal = true)}
				disabled={subscriptionData?.status.includes("total_cancelled") || subscriptionData?.subscriptionPlan === "FREE"}
				class="text-sm font-bold py-2 px-4 rounded-lg w-[130px]
				{subscriptionData?.status.includes("total_cancelled") || subscriptionData?.subscriptionPlan === "FREE" ? 'bg-gray-400 text-gray-700 cursor-not-allowed' : 'bg-[#fe0000] text-white hover:bg-[#a60505]'}"
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
<PaymentModal showPaymentModal={showPaymentModal} closeModal={closeModal} />