import { DefaultNotificationService } from "../../src/services/default-notification-service";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

jest.mock("@aws-sdk/client-sns", () => {
    const actual = jest.requireActual("@aws-sdk/client-sns");
    return {
        ...actual,
        SNSClient: jest.fn(() => ({
            send: jest.fn(),
        })),
    };
});

describe("DefaultNotificationService Tests", () => {
    let mockSnsClient: jest.Mocked<SNSClient>;
    let notificationService: DefaultNotificationService;
    const importExportTopicArn = "arn:aws:sns:us-east-1:123456789012:import-export-topic";

    beforeEach(() => {
        mockSnsClient = new SNSClient({}) as jest.Mocked<SNSClient>;
        notificationService = new DefaultNotificationService(mockSnsClient, importExportTopicArn);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('notifyAboutImportExport should send "mentors.imported" event to SNS', async () => {
        const importEvent = {
            type: "mentors.imported",
            total: 100,
            success: 95,
            failed: 5,
        };

        await notificationService.notifyAboutImportExport(importEvent);

        expect(mockSnsClient.send).toHaveBeenCalledWith(
            expect.objectContaining({
                input: {
                    TopicArn: importExportTopicArn,
                    Subject: "Mentor Import Report",
                    Message: `Mentors Import Completed:
                    Total: 100
                    Success: 95
                    Failed: 5`,
                },
            }),
        );
    });

    test('notifyAboutImportExport should send "bookings.exported" event to SNS', async () => {
        const exportEvent = {
            type: "bookings.exported",
            exportStatus: "COMPLETED",
            recordCount: 150,
            downloadUrl: "https://example.com/export.csv",
        };

        await notificationService.notifyAboutImportExport(exportEvent);

        expect(mockSnsClient.send).toHaveBeenCalledWith(
            expect.objectContaining({
                input: {
                    TopicArn: importExportTopicArn,
                    Subject: "Bookings Export Report",
                    Message: `Bookings Export Completed:
                    Status: COMPLETED
                    Records count: 150
                    Download Url: https://example.com/export.csv`,
                },
            }),
        );
    });

    test("notifyAboutImportExport should not send a message for unsupported event types", async () => {
        const unsupportedEvent = {
            type: "unsupported.event",
        };

        await notificationService.notifyAboutImportExport(unsupportedEvent);

        expect(mockSnsClient.send).not.toHaveBeenCalled();
    });

    test("notifyAboutImportExport should not send a message for undefined event type", async () => {
        const undefinedEvent = {
            anotherField: "test",
        };

        await notificationService.notifyAboutImportExport(undefinedEvent);

        expect(mockSnsClient.send).not.toHaveBeenCalled();
    });

});