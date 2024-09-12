export async function processRecurringInvoices(db, is_dev, verifiedList, UID_CHARS) {
    const ref2 = db.ref(`/payment${is_dev}/6_invoice`);
    const snapshot2 = await ref2.once('value');

    try {
        snapshot2.forEach(childSnapshot => {
            const reference_number = childSnapshot.key; // Get the reference number from the path

            // Check if refunded
            if (childSnapshot.val().refunded) {
                console.log('REFUNDED Reference Number: ' + reference_number);
                return; // Skip this entry if it is refunded
            }
            //just removing the refunded key from the object so it doesn't mess with the reversing 
            const invoices = Object.keys(childSnapshot.val())
                .filter(key => key !== 'refunded') // Filter out the 'refunded' key
                .reverse(); // Reverse to get the latest invoice based on timestamp



            // Get the most recent invoice (first after reversing)
            const mostRecentInvoiceKey = invoices[0];
            const mostRecentInvoiceData = childSnapshot.child(mostRecentInvoiceKey).val();
            const invoiceData = mostRecentInvoiceData.data.attributes;

            // Extracting values for conditions
            const invoiceStatus = invoiceData.status;
            const subscriptionStatus = invoiceData.subscription.status;
            const uid = reference_number.split('-').pop();
            const plan_code = reference_number.split('-')[0].split('_')[1];
            const cutUID = uid.substring(0, UID_CHARS);
            // Map plan codes to their respective types
            const planTypeMapping = {
                'LITE': 'L',
                'QLITE': 'L',
                'ALITE': 'L',
                'PRO': 'P',
                'QPRO': 'P',
                'APRO': 'P'
            };
            const planType = planTypeMapping[plan_code] || '?';

            // Filter out any recurring transactions already in verifiedList to avoid duplicates
            // if filtered out, it prioritizes the most recent transaction
            const patternsToFilter = [
                cutUID,              // Exact match (e.g., 'bRmyBIz') pro
                `-${cutUID}`,        // Hyphen-prefixed match (e.g., '-bRmyBIz') lite
                `^${cutUID}`,        // Caret-prefixed match (e.g., '^bRmyBIz') recurring pro
                `^-${cutUID}`,       // Caret and hyphen-prefixed match (e.g., '^'-bRmyBIz') recurring lite
                `*${cutUID}`,        // Asterisk-prefixed match (e.g., '*bRmyBIz') cancelled pro
                `*-${cutUID}`,       // Asterisk and hyphen-prefixed match (e.g., '*-bRmyBIz') cancelled lite
                `*^${cutUID}`,       // Asterisk and caret-prefixed match (e.g., '*^bRmyBIz')   cancelled recurring pro
                `*^-${cutUID}`       // Asterisk, caret, and hyphen-prefixed match (e.g., '*^-bRmyBIz') cancelled recurring lite
            ];
            verifiedList = verifiedList.filter(v => 
                !patternsToFilter.some(pattern => v === pattern)
            );

            if (invoiceStatus === 'paid' && subscriptionStatus === 'active') {
                if (planType === 'P') {
                    verifiedList.push('^' + cutUID);
                } else if (planType === 'L') {
                    verifiedList.push('^-' + cutUID);
                }
            } else if (invoiceStatus === 'paid' && subscriptionStatus === 'cancelled') {
                if (planType === 'P') {
                    verifiedList.push('*^' + cutUID);
                } else if (planType === 'L') {
                    verifiedList.push('*^-' + cutUID);
                }
            }
        });
    } catch (error) {
        console.error('Error looping through recurring data:', error);
    }

    return verifiedList;
}
