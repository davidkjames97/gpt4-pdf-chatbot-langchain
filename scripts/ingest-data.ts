import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { OpenAIEmbeddings } from 'langchain/embeddings';
import { PineconeStore } from 'langchain/vectorstores';
import { pinecone } from '@/utils/pinecone-client';
import { PINECONE_INDEX_NAME, PINECONE_NAME_SPACE } from '@/config/pinecone';
import fs from 'fs';
import readline from 'readline';

/* Name of directory to retrieve your files from */
const ndjsonFilePath = 'exported_data.ndjson';

async function processNDJSON(filePath: string): Promise<string[]> {
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  let texts = [];
  for await (const line of rl) {
    const jsonLine = JSON.parse(line);
    console.log(jsonLine);
    console.log(jsonLine._source, 'source');
    const text = jsonLine._source.body as string;
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
    const splitText = await textSplitter.splitText(text);
    console.log('split text', splitText);
    // Process the JSON object here
    texts.push(...splitText);
  }
  return texts;
}

export const run = async () => {
  try {
    const texts = await processNDJSON(ndjsonFilePath);

    console.log('creating vector store...');
    /*create and store the embeddings in the vectorStore*/
    const embeddings = new OpenAIEmbeddings();
    const index = pinecone.Index(PINECONE_INDEX_NAME); //change to your own index name

    //embed the PDF documents
   await PineconeStore.fromTexts(texts, [], embeddings, {
      pineconeIndex: index,
      namespace: PINECONE_NAME_SPACE,
      textKey: 'text',
    });
  } catch (error) {
    console.log('error', error);
    throw new Error('Failed to ingest your data');
  }
};

(async () => {
  await run();
  console.log('ingestion complete');
})();
