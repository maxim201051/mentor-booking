import { PublishCommand, SNSClient } from "@aws-sdk/client-sns";

export class DefaultNotificationService {
    private readonly snsClient: SNSClient;
    private readonly importExportTopicArn: string; 

    constructor(snsClient: SNSClient, importExportTopicArn: string) {
        this.snsClient = snsClient;
        this.importExportTopicArn = importExportTopicArn;
    }

    async notifyAboutImportExport(importExportEvent : any): Promise<void> {
        let command;
        if(importExportEvent.type === "mentors.imported") {
            command = new PublishCommand({
                TopicArn: this.importExportTopicArn,
                Subject: "Mentor Import Report",
                Message: `Mentors Import Completed:
                    Total: ${importExportEvent.total}
                    Success: ${importExportEvent.success}
                    Failed: ${importExportEvent.failed}`,
            });
        }
        if(importExportEvent.type === "bookings.exported") {
            command = new PublishCommand({
                TopicArn: this.importExportTopicArn,
                Subject: "Bookings Export Report",
                Message: `Bookings Export Completed:
                    Status: ${importExportEvent.exportStatus}
                    Records count: ${importExportEvent.recordCount}
                    Download Url: ${importExportEvent.downloadUrl}`,
            });
        }
        console.log(command);
        if(command !== undefined) {
            await this.snsClient.send(command);
        }
    }
}