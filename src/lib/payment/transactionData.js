const all_plans = ['P1', 'P3', 'P6', 'P12', 'L1', 'L3', 'L6', 'L12']; 
export function transactionData(uid, email, plan) {
    let data = {};
    // 7-8-24  removed 'dob', 'dob_ubp'
    // 6-20-24  removed 'gcash'
    // 8-11-24  removed 'card', added 'gcash', 'dob', 'dob_ubp'
    // 8-12-24 removed 'gcash'
    // 8-16-24 new but not still not available 'brankas_bdo', 'brankas_landbank', 'brankas_metrobank'
    // 8-17-24 removed 'card'
    const paymentMethods =
        ['paymaya', 'grab_pay', 'dob', 'dob_ubp', 'card']
            // 'brankas_bdo', 'brankas_landbank', 'brankas_metrobank'];

    if (process.env.FUNCTIONS_EMULATOR) {
        // 5-17-24 added gcash payment method
        // 4-16-24 "gcash payment method is not allowed."
        // paymentMethods.push('gcash');
    }

    let tester = false;
    try {
        tester = email && (email.includes('@jur.ph') || email === 'findeds@gmail.com');
    } catch (error) {
        console.error('set tester error:', error);
    }

    // check if plan is in plans
    if (!all_plans.includes(plan)) { // must be historical, all_plans instead of allowed_plans
        const err = 'Invalid plan';
        console.error(err);
        return
    }

    const days_valid = {
        Pro: {
            'P1': 31,
            'P3': 92,
            'P6': 183,
            'P12': 365
        },
        Lite: {
            'L1': 31,
            'L3': 92,
            'L6': 183,
            'L12': 365
        }
    };

    // Price History:
    // v1: Lite: 299, 249, 199, 149 / Pro: 599, 499, 399, 299
    // v2: Lite: 399, 299, 199, 199 / Pro 599, 499, 399, 299

    // Updated June 24, 2024 - Ann: the day before surgery
    // v3: Lite: 599, 299, xxx, 199 / Pro: 999, 499, xxx, 399
    // v4: Lite: 699, 399, 299, 199 / Pro: 999, 599, 499, 299
    // v5: Total Approach - Lite: 600, 1199, 1799, 2399 / Pro: 1000, 1999, 2999, 3999
    const price = {
        Pro: {
            'P1': 600,
            'P3': 1500,
            'P6': 3000, // not implemented
            'P12': 4800
        },
        Lite: {
            'L1': 300,
            'L3': 750,
            'L6': 1500, // not implemented
            'L12': 3000 // not implemented
        }
    };

    const price_total = {
        Pro: {
            'P1': 60000,
            'P3': 150000,
            'P6': 300000,
            'P12': 480000
        },
        Lite: {
            'L1': 30000,
            'L3': 75000,
            'L6': 150000,
            'L12': 300000
        }
    };

    if (plan === 'P1') {
        data = {
            reference_prefix: plan,
            amount: price_total['Pro'][plan],
            name: `Pro - 1 Month`,
            payment_methods: paymentMethods,
            daysValid: days_valid['Pro'][plan]
        }
    } else if (plan === 'P3') {
        data = {
            reference_prefix: plan,
            amount: price_total['Pro'][plan],
            name: `Pro - 3 Months`,
            payment_methods: paymentMethods,
            daysValid: days_valid['Pro'][plan]
        }
    } else if (plan === 'P6') {
        data = {
            reference_prefix: plan,
            amount: price_total['Pro'][plan],
            name: `Pro - 6 Months`,
            payment_methods: paymentMethods,
            daysValid: days_valid['Pro'][plan]
        }
    } else if (plan === 'P12') {
        data = {
            reference_prefix: plan,
            amount: price_total['Pro'][plan],
            name: `Pro - 12 Months`,
            payment_methods: paymentMethods,
            daysValid: days_valid['Pro'][plan]
        }
    }

     else if (plan === 'L1') {
        data = {
            reference_prefix: plan,
            amount: price_total['Lite'][plan],
            name: `Lite - 1 Month`,
            payment_methods: paymentMethods,
            daysValid: days_valid['Lite'][plan]
        }
    } else if (plan === 'L3') {
        data = {
            reference_prefix: plan,
            amount: price_total['Lite'][plan],
            name: `Lite - 3 Months`,
            payment_methods: paymentMethods,
            daysValid: days_valid['Lite'][plan]
        }
    } else if (plan === 'L6') {
        data = {
            reference_prefix: plan,
            amount: price_total['Lite'][plan],
            name: `Lite - 6 Months`,
            payment_methods: paymentMethods,
            daysValid: days_valid['Lite'][plan]
        }
    } else if (plan === 'L12') {
        data = {
            reference_prefix: plan,
            amount: price_total['Lite'][plan],
            name: `Lite - 12 Months`,
            payment_methods: paymentMethods,
            daysValid: days_valid['Lite'][plan]
        }
    } else {
        const err = 'Invalid Plan';
        console.error(err);
        return err;
    }

    if (tester) {
        data.amount = 2000;
    }
    return data;
}