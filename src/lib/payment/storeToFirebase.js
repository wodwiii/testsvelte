import { db } from "$lib/firebase/firebaseAdmin";
const is_dev = `${import.meta.env.VITE_IS_DEV}`
export const revalidate = 0;
export async function saveToFirebase(table, payload) {
    // add format Feb 20, 2021 12:00:00 PM
    const date = new Date();
    payload.epoch = date.getTime();
    payload.updated = new Date().toLocaleString('en-US', {timeZone: 'Asia/Singapore'});

    let invalid_reason = '';
    try {
        // get payload/data/attributes/reference_number
        // check first if data exists
        let reference_number = '';

        if (table === "checkout") {
            const uid = payload.uid; // only exclusive to check out, otherwise pop reference_number
            reference_number = payload.data.attributes.reference_number;
            
            try {
                // set humanDate to data
                const month_day = (date.getMonth() + 1).toString().padStart(2, '0')
                    + '-' + date.getDate().toString().padStart(2, '0')
                    + '-' + date.getFullYear();
                const month_day_time = month_day + ' ' + date.toLocaleTimeString(
                    'en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
                const ref0 = db.ref(`/payment_log${is_dev}/checkout/${month_day}`);
                await ref0.child(uid).set(`${month_day_time} - ${reference_number}`);
                await ref0.child('-count').set((await ref0.once('value')).numChildren() - 1);
            } catch (error) {
                console.error('DB log checkout error:', error);
            }

            const ref = db.ref(`/payment${is_dev}/1_checkout`);
            // only save if not existing
            const snapshot = await ref.child(reference_number).once('value');
            if (!snapshot.exists()) {
                console.log('Saving 1_checkout ' + table + ': ' + reference_number);
                await ref.child(reference_number).set(payload);
            }

            const ref2 = db.ref(`/payment${is_dev}/2_checkout_uid`);
            // only save if not existing
            const snapshot2 = await ref2.child(uid).child(reference_number).once('value');
            if (!snapshot2.exists()) {
                console.log('Saving 2_checkout_uid ' + table + ', uid:' + uid);
                await ref2.child(uid).child(reference_number).set(payload);
                return true;
            }

        } else if (table === "webhook") {
            reference_number = payload.data.attributes.data.attributes.reference_number;

            const ref = db.ref(`/payment${is_dev}/2_webhook`);
            // only save if not existing
            const snapshot = await ref.child(reference_number).once('value');
            if (!snapshot.exists()) {
                console.log('Saving 2_webhook ' + table + ': ' + reference_number);
                await ref.child(reference_number).set(payload);
                return true;
            }

        } else if (table === "verified") {
            reference_number = payload.data.attributes.reference_number;

            const ref = db.ref(`/payment${is_dev}/3_verified`);
            // only save if not existing
            const snapshot = await ref.child(reference_number).once('value');
            if (!snapshot.exists()) {
                console.log('Saving 3_verified ' + table + ': ' + reference_number);
                await ref.child(reference_number).set(payload);

                try {
                    const uid = reference_number.split('-').pop();
                    const month_day = (date.getMonth() + 1).toString().padStart(2, '0')
                        + '-' + date.getDate().toString().padStart(2, '0')
                        + '-' + date.getFullYear();
                    const month_day_time = month_day + ' ' + date.toLocaleTimeString(
                        'en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
                    const ref0 = db.ref(`/payment_log${is_dev}/paid/${month_day}`);
                    await ref0.child(uid).set(`${month_day_time} - ${reference_number}`);
                    await ref0.child('-count').set((await ref0.once('value')).numChildren() - 1);
                } catch (error) {
                    console.error('DB log verified error:', error);
                }

                // Notify dev
                //await notifyPushover(payload);

                return true;
            }

        } else if (table === "gist") {
            const ref = db.ref(`/payment${is_dev}/gist`);

            try {
                delete payload.epoch;
            } catch (error) {
                console.error('Error:', error);
            }
            // add count field on payload
            payload.count = payload.length;

            // compare if payload length is different
            const snapshot = await ref.once('value');
            const snapshotVal = snapshot.val();
            if (snapshotVal && snapshotVal.count !== payload.length) {
                console.log('Saving GIST gist: ' + payload)
                await ref.set(payload);
                return true;
            }
            else{
                console.log('Saving GIST gist: ' + payload)
                await ref.set(payload);
                return true;
            }
        } else {
            const err = 'Invalid table: ' + table;
            console.error(err);
            return false;
        }

        return false;
    } catch (error) {
        console.error('Error:', error);
        invalid_reason = error;
    }

    const ref = db.ref(`/payment${is_dev}/invalid/` + table);
    const timestamp = Date.now() + '';
    // add to json payload in path payload/invalid_reason
    payload.invalid_reason = invalid_reason;
    console.log('Setting invalid data: ' + timestamp + ' ' + JSON.stringify(payload));

    await ref.child(timestamp).set(payload);
    return false;
}