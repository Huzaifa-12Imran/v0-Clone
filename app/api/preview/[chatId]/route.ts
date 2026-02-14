import { type NextRequest } from "next/server";
import { getChatStore } from "@/lib/chat-store";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> },
) {
  try {
    const { chatId } = await params;
    console.log(`[Preview] Generating preview for chat: ${chatId}`);
    
    const chatStore = getChatStore();
    const messages = chatStore.get(chatId);

    // If no messages yet, it might be a new chat still being initialized
    const lastModelMessage = [...(messages || [])].reverse().find(m => m.role === "model");
    if (!messages || messages.length === 0 || !lastModelMessage) {
      console.log(`[Preview] Chat ${chatId} initializing or no model message yet`);
      return new Response(`
        <div style="padding: 20px; font-family: sans-serif; text-align: center; color: #374151;">
            <div style="margin: 40px auto; width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #3b82f6; border-radius: 50%; animation: spin 1s linear infinite;"></div>
            <h3 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 8px;">Generating content...</h3>
            <p style="color: #6b7280; font-size: 0.875rem;">Your preview will appear here as soon as the first code block is ready.</p>
            <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
            <script>setTimeout(() => window.location.reload(), 2000);</script>
        </div>
      `, { status: 200, headers: { "Content-Type": "text/html" } });
    }

    const content = lastModelMessage.content;
    const codeBlockRegex = /```[\w]*[^\n]*\n([\s\S]*?)```/gi;
    const matches = Array.from(content.matchAll(codeBlockRegex));
    
    console.log(`[Preview] Found ${matches.length} code blocks for chat ${chatId}`);

    // Process each code block separately
    const processedBlocks: any[] = [];
    
    for (const match of matches) {
      const rawCode = match[1].trim();
      let codeToProcess = rawCode;
      let blockName = `Preview ${processedBlocks.length + 1}`;
      let isJS = /function|const|class|=>/.test(rawCode);

      // Check if it's a full-stack JSON block
      if (rawCode.startsWith("{") && rawCode.endsWith("}")) {
        try {
          const json = JSON.parse(rawCode);
          if (json.type === "fullstack" && Array.isArray(json.files)) {
            // Find a renderable frontend file
            // Priority: app/page.tsx, src/app/page.tsx, any page.tsx, any .tsx, any .jsx
            const previewableFile = 
              json.files.find((f: any) => f.path === "app/page.tsx" || f.path === "src/app/page.tsx") ||
              json.files.find((f: any) => f.path.endsWith("page.tsx")) ||
              json.files.find((f: any) => f.path.endsWith(".tsx") || f.path.endsWith(".jsx"));

            if (previewableFile) {
              codeToProcess = previewableFile.content;
              blockName = `Preview: ${previewableFile.path.split("/").pop()}`;
              isJS = true;
            }
          }
        } catch (e) {
          // Not valid JSON or parsing failed, fall back to original logic
        }
      }
      
      // Process imports: convert lucide-react de-structuring to const { ... } = Lucide;
      let finalCode = codeToProcess.replace(
        /import\s+\{\s*([^}]+)\s*\}\s+from\s+['"]lucide-react['"];?/g,
        "const { $1 } = Lucide;"
      );
      
      // Strip remaining imports
      finalCode = finalCode.replace(/import\s+[\s\S]*?from\s+['"][^'"]+['"];?/g, "");

      const topLevelSignatures = [...codeToProcess.matchAll(/^\s*(?:export\s+)?(?:default\s+)?(?:function|const|class|var|let)\s+(\w+)/gm)];
      const pascalCaseMatch = topLevelSignatures.find(m => /^[A-Z]/.test(m[1]));
      const fallbackName = pascalCaseMatch ? pascalCaseMatch[1] : (topLevelSignatures.length > 0 ? topLevelSignatures[topLevelSignatures.length - 1][1] : "");

      if (fallbackName && !finalCode.match(/export\s+default/)) {
          finalCode += `\n\nexport default ${fallbackName};`;
      }

      processedBlocks.push({
          id: `block-${processedBlocks.length}`,
          name: blockName,
          code: finalCode,
          fallbackName,
          isJS
      });
    }

    if (processedBlocks.length === 0) {
       if (content.includes("<") && content.includes(">")) {
           processedBlocks.push({ id: 'block-0', name: 'Preview', code: content, fallbackName: "", isJS: false });
       } else {
           return new Response(`
            <div style="padding: 20px; font-family: sans-serif;">
                <h3>No Preview Available</h3>
                <p>I couldn't find any code to preview in this chat.</p>
                <p style="font-size: 12px; color: #666;">If you just sent a message, wait for it to finish and then try clicking the refresh button in the preview panel.</p>
            </div>
           `, { status: 200, headers: { "Content-Type": "text/html" } });
       }
    }

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/react@18/umd/react.production.min.js" crossorigin></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js" crossorigin></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js" crossorigin></script>
    <title>Preview System</title>
    <style>
        body { margin: 0; padding: 0; min-height: 100vh; background: #fff; font-family: -apple-system, sans-serif; display: flex; flex-direction: column; overflow: hidden; }
        #preview-nav { background: #18181b; color: #fff; padding: 8px 16px; display: flex; gap: 8px; border-bottom: 1px solid #27272a; overflow-x: auto; flex-shrink: 0; position: relative; z-index: 9999; }
        .nav-btn { background: #27272a; border: none; color: #a1a1aa; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; cursor: pointer; white-space: nowrap; }
        .nav-btn.active { background: #3b82f6; color: #fff; }
        #root-container { flex: 1; position: relative; overflow: auto; background: #fff; min-height: 0; z-index: 1; }
        #root { min-height: 100%; width: 100%; display: flex; flex-direction: column; }
        .error-box { padding: 20px; color: #ef4444; background: #fef2f2; border: 1px solid #fee2e2; border-radius: 8px; margin: 16px; }
        pre { font-family: monospace; font-size: 11px; white-space: pre-wrap; word-break: break-all; }
        #loading { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: #fff; z-index: 10; font-weight: 600; color: #666; }
    </style>
</head>
<body>
    <div id="loading">Initializing Preview...</div>
    
    ${processedBlocks.length > 1 ? `
    <div id="preview-nav">
        ${processedBlocks.map((b, i) => `
            <button class="nav-btn ${i === 0 ? 'active' : ''}" onclick="window.switchBlock('${b.id}')">${b.name}</button>
        `).join('')}
    </div>
    ` : ''}

    <div id="root-container">
        <div id="root"></div>
    </div>

    <script type="text/babel">
        const blocks = ${JSON.stringify(processedBlocks)};
        let currentRoot = null;

        // Global Mocks
        const LucideIcon = ({ name, className }) => (
            <span className={className} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
            </span>
        );

        // Proxy to handle ANY Lucide icon name dynamically
        const Lucide = new Proxy({}, {
            get: (target, name) => {
                if (typeof name === 'string' && name !== '$$typeof' && name !== 'prototype') {
                    return (p) => <LucideIcon name={name} {...p} />;
                }
                return target[name];
            }
        });

        window.React = React;
        window.ReactDOM = ReactDOM;
        window.Lucide = Lucide;
        Object.assign(window, React);

        window.switchBlock = (id) => {
            const block = blocks.find(b => b.id === id);
            if (!block) return;
            document.querySelectorAll('.nav-btn').forEach(btn => {
                btn.classList.toggle('active', btn.innerText === block.name);
            });
            renderBlock(block);
        };

        const renderBlock = (block) => {
            const rootEl = document.getElementById('root');
            const loadingEl = document.getElementById('loading');
            if (loadingEl) loadingEl.style.display = 'none';
            
            if (currentRoot) {
                currentRoot.unmount();
                currentRoot = null;
            }
            rootEl.innerHTML = '';

            if (!block.isJS) {
                rootEl.innerHTML = block.code;
                return;
            }

            try {
                const result = Babel.transform(block.code, { 
                    presets: ['env', 'react'],
                    filename: 'preview.jsx' 
                });
                const componentCode = result.code;
                
                var wrappedCode = "(function(React, Lucide) { " + 
                    "const exports = {}; " + 
                    "const module = { exports }; " + 
                    componentCode + "; " + 
                    "const primary = exports.default || exports.App || (typeof App !== 'undefined' ? App : null); " +
                    "if (primary) return primary; " + 
                    (block.fallbackName ? "if (typeof " + block.fallbackName + " !== 'undefined') return " + block.fallbackName + "; " : "") +
                    "return null; " +
                "})(window.React, window.Lucide)";
                
                const Component = eval(wrappedCode);

                if (Component) {
                    currentRoot = ReactDOM.createRoot(rootEl);
                    currentRoot.render(<Component />);
                } else {
                    throw new Error("No primary component found.");
                }
            } catch (err) {
                console.error("Render error:", err);
                rootEl.innerHTML = '<div class="error-box">' +
                    '<h3 class="font-bold">Render Error in ' + block.name + '</h3>' +
                    '<p class="text-sm">' + err.message + '</p>' +
                    '<pre class="mt-2 p-2 bg-white rounded text-[10px] overflow-auto max-h-60">' + err.stack + '</pre>' +
                '</div>';
            }
        };

        // Global error handler to catch React rendering crashes
        window.addEventListener('error', (event) => {
            console.error("[Preview Global Error]", event.error || event.message);
            const rootEl = document.getElementById('root');
            const errorMsg = event.error ? (event.error.message || event.error) : event.message;
            
            if (rootEl && (rootEl.innerHTML === '' || rootEl.innerHTML.includes('Initializing'))) {
                rootEl.innerHTML = '<div class="error-box">' +
                    '<h3 class="font-bold">Execution Error</h3>' +
                    '<p class="text-sm">' + errorMsg + '</p>' +
                    '<p class="text-[10px] mt-2 opacity-70 italic">Hint: This often happens if an icon or variable is used but not defined, or if there is a syntax error in the code.</p>' +
                '</div>';
            }
        });

        setTimeout(() => renderBlock(blocks[0]), 50);
    </script>
</body>
</html>
    `;

    return new Response(html, {
      headers: { "Content-Type": "text/html" },
    });
  } catch (error) {
    console.error("Preview generation error:", error);
    return new Response("Error generating preview: " + (error instanceof Error ? error.message : "Unknown error"), { status: 500 });
  }
}
