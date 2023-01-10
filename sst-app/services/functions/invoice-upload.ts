import { S3Event } from "aws-lambda";
import { Textract } from "aws-sdk";

export const handler = async (event: S3Event) => {
  const bucketName = event.Records[0].s3.bucket.name;
  const fileName = event.Records[0].s3.object.key;

  const params = {
    Document: {
      S3Object: {
        Bucket: bucketName,
        Name: fileName,
      },
    },
  };

  const textract = new Textract();
  const command = textract.startExpenseAnalysis({
    DocumentLocation: {
      S3Object: {
        Bucket: bucketName,
        Name: fileName,
      },
    },
  });
  const { JobId } = await command.promise();

  const analysis = await textract.getDocumentAnalysis().promise();

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ event, analysis }),
  };
};
