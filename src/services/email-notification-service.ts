
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import Handlebars from "handlebars";
import { BookingNotificationEntity } from "../entities/booking-notification-entity";
import { bookingCancelledMentorEmailTemplate, bookingCancelledStudentEmailTemplate, bookingCreatedMentorEmailTemplate, bookingCreatedStudentEmailTemplate } from "../email/email-templates-container";

export class EmailNotificationService {
    private readonly sesClient: SESClient;

    constructor(sesClient: SESClient) {
        this.sesClient = sesClient;
    }

    async notifyAboutBooking(bookingNotification: BookingNotificationEntity): Promise<void> {
        let emailSubject = "";
        let studentEmailTemplate = "";
        let mentorEmailTemplate = "";
        if(bookingNotification.type === "booking.created") {
            emailSubject = "Booking Confirmation";
            studentEmailTemplate = bookingCreatedStudentEmailTemplate;
            mentorEmailTemplate = bookingCreatedMentorEmailTemplate;
        }
        if(bookingNotification.type === "booking.cancelled") {
            emailSubject = "Booking Cancellation";
            studentEmailTemplate = bookingCancelledStudentEmailTemplate;
            mentorEmailTemplate = bookingCancelledMentorEmailTemplate;
        }
        const studentEmailTemplateCompiled = Handlebars.compile(studentEmailTemplate);
        const mentorEmailTemplateCompiled = Handlebars.compile(mentorEmailTemplate);
        const studentEmailBody = studentEmailTemplateCompiled({
            bookingId: bookingNotification.bookingId,
            studentFullName: bookingNotification.studentFullName,
            mentorFullName: bookingNotification.mentorFullName,
            mentorEmail: bookingNotification.mentorEmail,
            startDate: bookingNotification.startDate,
            endDate: bookingNotification.endDate,
        });
        const mentorEmailBody = mentorEmailTemplateCompiled({
            bookingId: bookingNotification.bookingId,
            studentFullName: bookingNotification.studentFullName,
            studentEmail: bookingNotification.studentEmail,
            mentorFullName: bookingNotification.mentorFullName,
            startDate: bookingNotification.startDate,
            endDate: bookingNotification.endDate,
        });
        console.log(studentEmailBody);
        const studentEmailParams = this.createEmailParams("noreply@yourdomain.com", bookingNotification.studentEmail, emailSubject, studentEmailBody);
        const mentorEmailParams = this.createEmailParams("noreply@yourdomain.com", bookingNotification.mentorEmail, emailSubject, mentorEmailBody);
        console.log(studentEmailParams);
        await this.sendEmail(studentEmailParams);
        await this.sendEmail(mentorEmailParams);
        console.log("email should be sent here");
    }

    private createEmailParams(sender: string, recipient: string, emailSubject: string, emailBody: string) {
        return {
            Destination: {
                ToAddresses: [recipient], 
                },
                Message: {
                Body: {
                    Text: {
                    Data: emailBody,
                    },
                },
                Subject: {
                    Data: emailSubject,
                },
            },
            Source: sender,
        };
    }

    private async sendEmail(emailParams: any) {
        const sendEmailCommand = new SendEmailCommand(emailParams);
        await this.sesClient.send(sendEmailCommand);
    }
}