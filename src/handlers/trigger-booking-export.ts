import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";

const sqsClient = new SQSClient({ 
    region: process.env.REGION 
});

export const main = async (event: any) => {
    return await handleTriggerExport(event, { sqsClient });    
}

export const handleTriggerExport = async (event: any, dependencies: { sqsClient:  SQSClient; }) => {
    try {
        const role = event.headers?.role;
        if(!role) {
            return {
              statusCode: 401,
              body: JSON.stringify({
                error: 'role header is required',
              }),
            };
        };
        if(role !== "admin") {
            return {
                statusCode: 403,
                body: JSON.stringify({
                  error: 'Access denied',
                }),
            };
        }

        const bookingExportEvent = {
            task: "export_bookings",
        };
    
        const command = new SendMessageCommand({
            QueueUrl: process.env.BOOKING_EXPORT_QUEUE_URL,
            MessageBody: JSON.stringify(bookingExportEvent),
        });
      
        await dependencies.sqsClient.send(command);

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Bookings export was successfully triggered',
            }),
        };
    } catch(error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Internal Server Error" }),
        };
    }
    
}