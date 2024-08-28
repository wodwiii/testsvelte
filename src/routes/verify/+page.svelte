<script>
// @ts-nocheck

    import { paymentIntentId } from '../../store/paymentStore';
    import { onMount } from 'svelte';

    let status = '';

    onMount(async () => {
        try {
            while (status !== 'succeeded' && status !== 'failed') {
                await new Promise(resolve => setTimeout(resolve, 2000));
                status = await checkPaymentStatus($paymentIntentId);
            }

            if (status === 'succeeded') {
                alert('Payment Successful!');
                window.location.href = '/dashboard';
            } else {
                alert('Payment Failed. Please try again.');
            }
        } catch (error) {
            console.error('Error checking payment status:', error);
            alert('An error occurred while verifying the payment. Please try again.');
        }
    });


    const checkPaymentStatus = async (paymentIntentId) => {
        const url = new URL('/api/check-payment-status', window.location.origin);
        url.searchParams.append('id', paymentIntentId);

        const response = await fetch(url.toString());
        if (!response.ok) {
            throw new Error('Failed to fetch payment status');
        }

        const data = await response.json();
        return data.status;
    };
</script>

<div class="min-h-[100vh] text-center">
    <div>
        Verifying payment...
    </div>
</div>
