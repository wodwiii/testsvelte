import { db } from "$lib/firebase/firebaseAdmin";

export async function storeToFirebase(table, payload) {
    const date = new Date();
    payload.epoch = date.getTime();
    payload.updated = new Date().toLocaleString('en-US', { timeZone: 'Asia/Singapore' });


    switch (table) {
        case 'subscription': {
            const epochTime = Math.floor(Date.now() / 1000);
            const uid = payload.uid;
            const planReverseMapping = {
                [import.meta.env.VITE_PAYMONGO_LITE_PLAN_ID]: 'LITE',
                [import.meta.env.VITE_PAYMONGO_QLITE_PLAN_ID]: 'QLITE',
                [import.meta.env.VITE_PAYMONGO_ALITE_PLAN_ID]: 'ALITE',
                [import.meta.env.VITE_PAYMONGO_PRO_PLAN_ID]: 'PRO',
                [import.meta.env.VITE_PAYMONGO_QPRO_PLAN_ID]: 'QPRO',
                [import.meta.env.VITE_PAYMONGO_APRO_PLAN_ID]: 'APRO'
            };
            
            // store payload to 4_subscription and 5_subscription_uid
            const plan_id = payload.data.attributes.plan.id;
            const plan_code = planReverseMapping[plan_id] || '?';
            const reference_number = `${epochTime}_${plan_code}-${uid}`
            payload.reference_number = reference_number;
            const ref = db.ref(`/payment/4_subscription`);
            const snapshot = await ref.child(reference_number).once('value');
            if (!snapshot.exists()) {
                console.log('Saving 4_subscription ' + table + ': ' + reference_number);
                await ref.child(reference_number).set(payload);
            }

            const ref2 = db.ref(`/payment/5_subscription_uid`);
            const snapshot2 = await ref2.child(uid).child(reference_number).once('value');
            if (!snapshot2.exists()) {
                console.log('Saving 5_subscription_uid ' + table + ', uid:' + uid);
                await ref2.child(uid).child(reference_number).set(payload);
            }
            return;
        }
        // case 'verified': {
        //     const reference_number = payload.reference_number;
        //     const ref = db.ref(`/payment/3_verified`);
        //     // only save if not existing
        //     const snapshot = await ref.child(reference_number).once('value');
        //     if (!snapshot.exists()) {
        //         console.log('Saving 3_verified ' + table + ': ' + reference_number);
        //         await ref.child(reference_number).set(payload);
        //     }
        //     return;
        // }
        case 'invoice': {
            const reference_number = payload.reference_number;
            const invoice_id = payload.data.id;
            const epoch = payload.data.attributes.created_at; 
            const uid = payload.reference_number.split('-')[1];
            const ref = db.ref(`/payment/6_invoice/${reference_number}`);
            const snapshot = await ref.child(`${epoch}_${invoice_id}`).once('value');
            //save or overwrite if exists
            console.log('Saving 6_invoice ' + table + ': ' + invoice_id);
            await ref.child(`${epoch}_${invoice_id}`).set(payload);
            return;
        }
        default: {
            console.error('Invalid table name:', table)
            throw new Error(`Invalid table name: ${table}`)
        }
    }
}


