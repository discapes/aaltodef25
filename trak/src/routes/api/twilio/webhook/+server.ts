import type { RequestEvent } from '@sveltejs/kit';

export const POST = async ({ request }: RequestEvent) => {
    const formData = await request.formData();
    const messageBody = formData.get('Body');
    
    console.log('Received Twilio message:', messageBody);
    
    // Return a 200 OK response to acknowledge receipt
    return new Response('OK', {
        status: 200
    });
};