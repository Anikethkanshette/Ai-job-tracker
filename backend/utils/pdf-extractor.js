import { createRequire } from 'module';
const require = createRequire(import.meta.url);

export async function extractTextFromFile(buffer, mimetype) {
    try {
        // Handle PDF files
        if (mimetype === 'application/pdf') {
            // Use require to load CommonJS module properly
            const pdf = require('pdf-parse');
            const data = await pdf(buffer);
            return data.text;
        }

        // Handle text files
        if (mimetype === 'text/plain') {
            return buffer.toString('utf-8');
        }

        throw new Error('Unsupported file type. Please upload PDF or TXT files.');
    } catch (error) {
        // Provide more helpful error message
        if (error.message.includes('ENOENT') && error.message.includes('test')) {
            throw new Error('PDF processing error. Please ensure the file is a valid PDF.');
        }
        throw new Error(`Failed to extract text: ${error.message}`);
    }
}
