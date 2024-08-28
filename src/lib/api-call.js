// @ts-nocheck
import { post, get } from '$lib/helper/api';

export const createCustomer = async (customerData) => {
    try {
        const response = await post('/api/create-customer', customerData);
        return response;
    } catch (error) {
        console.error('Error creating customer:', error);
        throw error;
    }
};

export const createSubscription = async (customerId, planId) => {
    try {
        const response = await post('/api/create-subscription', { customer_id: customerId, plan_id: planId });
        return response;
    } catch (error) {
        console.error('Error creating subscription:', error);
        throw error;
    }
};


export const createPaymentMethod = async (paymentMethodData) => {
    try {
        const response = await post('/api/create-payment-method', paymentMethodData);
        return response;
    } catch (error) {
        console.error('Error creating payment method:', error);
        throw error;
    }
};


export const attachPaymentMethod = async (paymentIntentId, paymentMethodId) => {
    try {
        const response = await post('/api/attach-payment-method', {paymentIntentId, paymentMethodId});
        return response;
    } catch (error) {
        console.error('Error attaching payment method:', error);
        throw error;
    }
};

export const createCheckoutSession = async (plan) => {
    try {
        const response = await post('/api/create-checkout-session', { plan });
        return response;
    } catch (error) {
        console.error('Error creating checkout session:', error);
        throw error;
    }
};

export const cancelSubscription = async (subscriptionId, uid) => {
    try {
        const response = await post('/api/cancel-subscription', { subscriptionId,uid });
        return response;
    } catch (error) {
        console.error('Error cancelling subscription:', error);
        throw error;
    }
};