import { S3Client } from '@aws-sdk/client-s3';
import { UploadService } from '../services/upload-service';

const uploadService = new UploadService(
    process.env.IMPORT_EXPORT_BUCKET_NAME || '',
    new S3Client({ 
        region: process.env.REGION,
    }),
);

export const main = async (event: any) => {
    return await handleUploadMentors(event, { uploadService });    
}

export const handleUploadMentors = async (event: any, dependencies: { uploadService: UploadService }) => {
    try {
        const multipartFormDataBoundary = extractBoundary(event);
        const multipartFormDataBody = event.body;
        
        await uploadService.uploadMentorsImport(multipartFormDataBody, multipartFormDataBoundary);

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Mentors import file was successfully uploaded',
            }),
        };
    } catch (error) {
        return {
         statusCode: 500,
         body: JSON.stringify({ error: "Internal Server Error" }),
        };
    }
}

const extractBoundary = (event: any): string => {
    const contentType = event.multiValueHeaders["Content-Type"]?.[0];
  
    if (!contentType) {
      throw new Error("Content-Type header not found.");
    }
  
    const boundaryMatch = contentType.match(/boundary=([^;]*)/);
  
    if (!boundaryMatch) {
      throw new Error("Boundary value not found in Content-Type header.");
    }
  
    return boundaryMatch[1];
  };
  