import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { Copy, Check, Play, Loader2 } from 'lucide-react';
import axios from 'axios';

const CodeBlock = ({ code, language }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        toast.success("Code copied to clipboard!");
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="bg-neutral-900 rounded-lg relative group">
            <button
                onClick={handleCopy}
                className="absolute top-2 right-2 p-1.5 bg-neutral-800 rounded-md text-neutral-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
            >
                {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
            </button>
            <pre className={`language-${language} p-4 rounded-lg text-sm overflow-x-auto`}>
                <code>{code}</code>
            </pre>
        </div>
    );
};


const ApiDocs = ({ apiKey }) => {
    if (!apiKey) return null;

    const baseUrl = `${window.location.origin}/api/whatsapp/send`;
    const exampleReceiver = "919876543210";
    const exampleMessage = "Check out this amazing photo!";
    // 1. Add an example media URL for the documentation
    const exampleMediaUrl = "https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Taj_Mahal_in_India_-_Kristian_Bertel.jpg/1280px-Taj_Mahal_in_India_-_Kristian_Bertel.jpg";

    // --- Code examples now include the optional mediaUrl parameter ---
    const curlExample = `curl -X GET "${baseUrl}?receiver=${exampleReceiver}&msgtext=${encodeURIComponent(exampleMessage)}&mediaUrl=${encodeURIComponent(exampleMediaUrl)}&token=${apiKey}"`;

    const nodeJsExample = `const axios = require('axios');

const params = {
  receiver: '${exampleReceiver}',
  msgtext: '${exampleMessage}',
  mediaUrl: '${exampleMediaUrl}', // The new optional parameter
  token: '${apiKey}'
};

axios.get('${baseUrl}', { params })
  .then(response => {
    console.log('Success:', response.data);
  })
  .catch(error => {
    console.error('Error:', error.response.data);
  });`;

    const pythonExample = `import requests

url = '${baseUrl}'
params = {
    'receiver': '${exampleReceiver}',
    'msgtext': '${exampleMessage}',
    'mediaUrl': '${exampleMediaUrl}', # The new optional parameter
    'token': '${apiKey}'
}

response = requests.get(url, params=params)

if response.status_code == 200:
    print('Success:', response.json())
else:
    print('Error:', response.status_code, response.json())`;

    // Sandbox State
    const [sandboxData, setSandboxData] = useState({
        receiver: '',
        message: 'Hello from NextSMS!',
        mediaUrl: ''
    });
    const [loading, setLoading] = useState(false);
    const [response, setResponse] = useState(null);

    const handleTestRequest = async () => {
        if (!sandboxData.receiver || !sandboxData.message) {
            toast.error("Receiver and Message are required");
            return;
        }

        setLoading(true);
        setResponse(null);

        try {
            const res = await axios.get(`${baseUrl}`, {
                params: {
                    receiver: sandboxData.receiver,
                    msgtext: sandboxData.message,
                    mediaUrl: sandboxData.mediaUrl,
                    token: apiKey
                }
            });
            setResponse({ success: true, status: res.status, data: res.data });
            toast.success("Request sent successfully!");
        } catch (err) {
            setResponse({
                success: false,
                status: err.response?.status || 500,
                data: err.response?.data || err.message
            });
            toast.error("Request failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-5xl bg-black/80 backdrop-blur-sm border border-neutral-800 rounded-2xl p-8 shadow-lg mt-8">
            <h2 className="text-2xl font-bold text-white">Developer <span className="bg-clip-text text-transparent bg-gradient-to-br from-cyan-400 to-indigo-500">Documentation</span></h2>
            <p className="text-neutral-400 mt-2 mb-6">
                Use your API key to send messages from any application.
            </p>

            {/* LIVE SANDBOX */}
            <div className="mb-10 bg-neutral-900/50 border border-neutral-700/50 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Play size={20} className="text-green-400" />
                    <h3 className="text-lg font-semibold text-white">API Live Sandbox</h3>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <div>
                        <label className="block text-xs font-medium text-neutral-400 mb-1">Receiver (with country code)</label>
                        <input
                            type="text"
                            placeholder="e.g. 919876543210"
                            className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500 transition-colors"
                            value={sandboxData.receiver}
                            onChange={(e) => setSandboxData({ ...sandboxData, receiver: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-neutral-400 mb-1">Message Text</label>
                        <input
                            type="text"
                            placeholder="Hello world"
                            className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500 transition-colors"
                            value={sandboxData.message}
                            onChange={(e) => setSandboxData({ ...sandboxData, message: e.target.value })}
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-neutral-400 mb-1">Media URL (Optional)</label>
                        <input
                            type="text"
                            placeholder="https://example.com/image.jpg"
                            className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500 transition-colors"
                            value={sandboxData.mediaUrl}
                            onChange={(e) => setSandboxData({ ...sandboxData, mediaUrl: e.target.value })}
                        />
                    </div>
                </div>

                <div className="mt-4 flex flex-col md:flex-row gap-4 items-start md:items-center">
                    <button
                        onClick={handleTestRequest}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-md transition-colors"
                    >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                        Send Test Request
                    </button>

                    {response && (
                        <div className={`flex-1 w-full p-3 rounded-md text-xs font-mono overflow-x-auto ${response.success ? 'bg-green-900/20 border border-green-800/50 text-green-300' : 'bg-red-900/20 border border-red-800/50 text-red-300'}`}>
                            <div><strong>Status:</strong> {response.status}</div>
                            <div className="mt-1 whitespace-pre-wrap">{JSON.stringify(response.data, null, 2)}</div>
                        </div>
                    )}
                </div>
            </div>

            {/* Endpoint Info */}
            <div>
                <h3 className="text-lg font-semibold text-white mb-2">Endpoint</h3>
                <div className="bg-neutral-900 border border-neutral-700 rounded-md p-3 text-sm">
                    <span className="font-bold text-green-400 mr-2">GET</span>
                    <code className="text-neutral-300">/api/whatsapp/send</code>
                </div>
            </div>

            {/* Parameters Table */}
            <div className="mt-6">
                <h3 className="text-lg font-semibold text-white mb-2">Query Parameters</h3>
                <div className="text-sm text-neutral-400 space-y-2">
                    <p><code className="bg-neutral-800 p-1 rounded">receiver</code> (required) - The recipient's phone number, including country code.</p>
                    <p><code className="bg-neutral-800 p-1 rounded">msgtext</code> (required) - The text content of your message (used as caption for media).</p>
                    {/* 2. THIS IS THE NEW DOCUMENTATION LINE */}
                    <p><code className="bg-neutral-800 p-1 rounded">mediaUrl</code> (optional) - A public URL to an image, video, or document.</p>
                    <p><code className="bg-neutral-800 p-1 rounded">token</code> (required) - Your personal API key.</p>
                </div>
            </div>

            {/* Code Examples */}
            <div className="mt-8">
                <h3 className="text-lg font-semibold text-white mb-4">Code Examples</h3>
                <div className="space-y-6">
                    <div>
                        <h4 className="font-semibold text-neutral-300 mb-2">cURL</h4>
                        <CodeBlock code={curlExample} language="bash" />
                    </div>
                    <div>
                        <h4 className="font-semibold text-neutral-300 mb-2">Node.js (Axios)</h4>
                        <CodeBlock code={nodeJsExample} language="javascript" />
                    </div>
                    <div>
                        <h4 className="font-semibold text-neutral-300 mb-2">Python (Requests)</h4>
                        <CodeBlock code={pythonExample} language="python" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ApiDocs;

