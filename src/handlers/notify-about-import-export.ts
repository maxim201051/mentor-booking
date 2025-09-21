import { SNSClient } from "@aws-sdk/client-sns";
import { DefaultNotificationService } from "../services/default-notification-service";

const defaultNotificationService = new DefaultNotificationService(
    new SNSClient({ 
        region: process.env.REGION 
    }),
    process.env.IMPORT_EXPORT_TOPIC_ARN || '',
)

export const main = async (event: any) => {
    return await handleNotifyAboutImportExport(event, { defaultNotificationService });
};

export const handleNotifyAboutImportExport = async (event: any, dependencies: { defaultNotificationService: DefaultNotificationService; }) => {
    try {
        for (const record of event.Records) {
            const importExportEvent = JSON.parse(record.body);
            if (importExportEvent.type !== "mentors.imported") {
                console.log(`Unexpected event type: ${importExportEvent.type}`)
                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        error: 'Unexpected event type',
                    }),
                };
            }
            await dependencies.defaultNotificationService.notifyAboutImportExport(importExportEvent);
        }
    
        return {
            message: "Notifications processed",
        };
    } catch (error) {
        console.error(error);
        throw error;
    }
}