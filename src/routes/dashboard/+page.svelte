<script>
// @ts-nocheck

	import { authHandlers, authStore, subscription, fetchSubscription } from "../../store/authStore";
    import { getSubscription } from '../../lib/firebase/subscription';
    import { onMount, tick } from 'svelte';

    let subscriptionData;
    let email;

    authStore.subscribe(async(curr) =>{
        email = curr?.currentUser?.email;
        await tick();
        if(email){
            await fetchSubscription();
            subscriptionData = $subscription;
        }
    })


</script>


<div class="min-h-[100vh] text-center">
    <div class="font-bold text-3xl text-[#fe0000] text-center py-10">
        Dashboard
    </div>
    <div class="flex flex-col content-center">
        {#if $authStore.currentUser}
        <div class="">
            Welcome, <span class="underline font-bold">{email}</span> 
        </div>
        {:else}
        <div>Loading...</div>
        {/if}
        <div class="mt-8">
            Subscription:
            <p>Plan: {subscriptionData?.plan}</p>
            <p>Expiration: {subscriptionData?.expires}</p>

        </div>
        <div class="mt-4">
            <button on:click={authHandlers.logout} class="bg-[#fe0000] text-white text-sm font-bold py-2 px-4 rounded-lg hover:bg-[#a60505]">Logout</button>
        </div>
    </div>
</div>