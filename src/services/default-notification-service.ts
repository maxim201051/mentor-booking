import { PublishCommand, SNSClient } from "@aws-sdk/client-sns";

export class DefaultNotificationService {
    private readonly snsClient: SNSClient;
    private readonly importExportTopicArn: string; 

    constructor(snsClient: SNSClient, importExportTopicArn: string) {
        this.snsClient = snsClient;
        this.importExportTopicArn = importExportTopicArn;
    }

    async notifyAboutImportExport(importExportEvent : any): Promise<void> {
        const command = new PublishCommand({
            TopicArn: this.importExportTopicArn,
            Subject: "Mentor Import Report",
            Message: `Mentors Import Completed:
                Total: ${importExportEvent.total}
                Success: ${importExportEvent.success}
                Failed: ${importExportEvent.failed}`,
        });
        console.log(command);
        await this.snsClient.send(command);
    }

}