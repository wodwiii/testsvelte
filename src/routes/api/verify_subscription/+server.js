import { json } from '@sveltejs/kit';
import { updateVerifiedList } from '$lib/payment/updateVerifiedList';
import { verifySubscriptionUID } from '$lib/payment-recurring/subscribe';

export async function GET({ url }) {
    const uid = url.searchParams.get('uid');

    if (!uid) {
        return json({ error: 'Missing UID' }, { status: 400 });
    }

    try {
        // Verify the checkout by UID
        // const refId = await verifySubscriptionUID(uid);
        await verifySubscriptionUID(uid);
        // Update the verified list
        await updateVerifiedList();

        // Return the refId as JSON
        // return json({ refId }, { status: 200 });
        return json({status: 200});
    } catch (error) {
        const err = 'Error verifying subscription ' + error.message;
        console.error(err);

        // Return the error message with status 500
        return json({ error: err }, { status: 500 });
    }
}
