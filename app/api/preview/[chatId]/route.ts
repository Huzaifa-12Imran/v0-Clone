import { type NextRequest } from "next/server";
import { getChatStore } from "@/lib/chat-store";
import { getChatMessages } from "@/lib/db/queries";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> },
) {
  try {
    const { chatId } = await params;
    console.log(`[Preview] Generating preview for chat: ${chatId}`);
    
    const chatStore = getChatStore();
    let messages = chatStore.get(chatId);

    // If in-memory store is empty, try to restore from database
    if (!messages || messages.length === 0) {
      console.log(`[Preview] In-memory store empty, restoring from DB for chat: ${chatId}`);
      const dbMessages = await getChatMessages({ chatId });
      if (dbMessages && dbMessages.length > 0) {
        messages = dbMessages.map(m => ({ 
          role: m.role as "user" | "model", 
          content: m.content 
        }));
        chatStore.set(chatId, messages);
        console.log(`[Preview] Restored ${messages.length} messages from DB`);
      }
    }

    const modelMessages = (messages || []).filter(m => m.role === "model");
    if (!messages || messages.length === 0 || modelMessages.length === 0) {
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

    // Merge sequential model messages to handle "continue" fragments
    // We take up to the last 5 model messages to reconstruct projects split by limits
    const content = modelMessages.slice(-5).map(m => m.content).join("\n\n");
    const codeBlockRegex = /```[\w]*[^\n]*\n([\s\S]*?)```/gi;
    let matches = Array.from(content.matchAll(codeBlockRegex));
    
    // Support for unclosed code blocks (truncated generation)
    if (matches.length === 0 && content.includes("```")) {
        const lastBlockIndex = content.lastIndexOf("```");
        const fragment = content.substring(lastBlockIndex + 3);
        // If it starts with a language tag, strip it
        const blockCode = fragment.replace(/^[a-zA-Z]*\n/, "");
        if (blockCode.trim().length > 20) {
            matches.push([null, blockCode] as any);
        }
    }
    
    console.log(`[Preview] Found ${matches.length} code blocks for chat ${chatId}`);

    // Process each code block separately
    const processedBlocks: any[] = [];
    
    for (const match of matches) {
      const rawCode = match[1].trim();
      if (!rawCode) continue;

      let codeToProcess = null;
      let blockName = null;
      let isJS = false;
      let isFullStack = false;

      // 1. Check if it's a full-stack JSON block
      const looksLikeJSON = rawCode.includes('"type"') && rawCode.includes('"files"');
      
      if (looksLikeJSON) {
        try {
          // Robust search for JSON: look for any { ... } block that contains "type" and "files"
          const searchPattern = /"type"\s*:\s*"(full-?stack|web|app|project|website)"/gi;
          let jsonMatch;
          let bestJson = null;

          while ((jsonMatch = searchPattern.exec(rawCode)) !== null) {
              let startIdx = -1;
              // Walk back to find the opening brace for this "type" property
              for (let i = jsonMatch.index; i >= Math.max(0, jsonMatch.index - 1000); i--) {
                  if (rawCode[i] === '{') {
                      startIdx = i;
                      break;
                  }
              }
              if (startIdx === -1) continue;

              // Brace counting forward to find the matching closing brace
              let balance = 0;
              let inStr = false;
              let isEscaped = false;
              let endIdx = -1;

              for (let i = startIdx; i < rawCode.length; i++) {
                  const c = rawCode[i];
                  if (inStr) {
                      if (isEscaped) isEscaped = false;
                      else if (c === '\\') isEscaped = true;
                      else if (c === '"') inStr = false;
                  } else {
                      if (c === '"') inStr = true;
                      else if (c === '{') balance++;
                      else if (c === '}') {
                          balance--;
                          if (balance === 0) {
                              endIdx = i + 1;
                              break;
                          }
                      }
                  }
              }

              let jsonStr = rawCode.substring(startIdx, endIdx === -1 ? rawCode.length : endIdx);
              
              // Handle truncated JSON (endIdx === -1)
              if (endIdx === -1) {
                  let currentBalance = 0;
                  let inStrTrunc = false;
                  for (let i = 0; i < jsonStr.length; i++) {
                      const c = jsonStr[i];
                      if (inStrTrunc) {
                          if (c === '\\') i++;
                          else if (c === '"') inStrTrunc = false;
                      } else {
                          if (c === '"') inStrTrunc = true;
                          else if (c === '{') currentBalance++;
                          else if (c === '}') currentBalance--;
                      }
                  }
                  while (currentBalance > 0) {
                      jsonStr += '}';
                      currentBalance--;
                  }
              }

              try {
                  const json = JSON.parse(jsonStr);
                  const validTypes = ["fullstack", "full-stack", "web", "app", "project", "website"];
                  if (json && typeof json.type === "string" && validTypes.includes(json.type.toLowerCase()) && Array.isArray(json.files)) {
                      bestJson = json;
                      break; // Found a valid one
                  }
              } catch (e) {
                  // Final attempt to fix trailing commas
                  try {
                      const fixed = jsonStr.replace(/,\s*([}\]])/g, '$1');
                      const json = JSON.parse(fixed);
                      if (json && Array.isArray(json.files)) {
                          bestJson = json;
                          break;
                      }
                  } catch (e2) {}
              }
          }

          if (bestJson) {
            isFullStack = true;
            
            // Extract ONLY page files
            const pageFiles = bestJson.files.filter((f: any) => {
              const path = f.path || "";
              return (
                (path.startsWith("app/") || path.startsWith("src/app/") || path.startsWith("pages/")) &&
                (path.endsWith("page.js") || path.endsWith("page.jsx") || path.endsWith("page.tsx") || path.endsWith("page.ts") || path.endsWith(".html")) &&
                !path.includes("layout.js") &&
                !path.includes("[id]") &&
                !path.includes("api/") &&
                !path.includes("/_")
              );
            });
            
            // Sort pages by priority
            const pageOrder = ["app/page.tsx", "src/app/page.tsx", "app/page.js", "src/app/page.js", "pages/index.html", "index.html"];
            pageFiles.sort((a: any, b: any) => {
              const aIdx = pageOrder.indexOf(a.path);
              const bIdx = pageOrder.indexOf(b.path);
              if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
              if (aIdx !== -1) return -1;
              if (bIdx !== -1) return 1;
              return a.path.localeCompare(b.path);
            });
            
            for (const file of pageFiles) {
              if (!file.content) continue;
              
              let finalCode = file.content;
              const isHtml = file.path.endsWith(".html");
              let fallbackName = "";
              
              if (!isHtml) {
                finalCode = finalCode.replace(
                  /import\s+\{\s*([^}]+)\s*\}\s+from\s+['"]lucide-react['"];?/g,
                  "const { $1 } = Lucide;"
                );
                finalCode = finalCode.replace(/import\s+[\s\S]*?from\s+['"][^'"]+['"];?/g, "");

                const topLevelSignatures = [...file.content.matchAll(/^\s*(?:export\s+)?(?:default\s+)?(?:function|const|class|var|let)\s+(\w+)/gm)];
                const pascalCaseMatch = topLevelSignatures.find(m => /^[A-Z]/.test(m[1]));
                fallbackName = pascalCaseMatch ? pascalCaseMatch[1] : (topLevelSignatures.length > 0 ? topLevelSignatures[topLevelSignatures.length - 1][1] : "");

                if (fallbackName && !finalCode.match(/export\s+default/)) {
                    finalCode += `\n\nexport default ${fallbackName};`;
                }
              }
              
              let pageName = file.path
                .replace(/^app\//, "")
                .replace(/^src\/app\//, "")
                .replace(/^pages\//, "")
                .replace(/\/page\.tsx$/, "")
                .replace(/\/page\.jsx$/, "")
                .replace(/\/page\.js$/, "")
                .replace(/\/page\.ts$/, "")
                .replace(/\.html$/, "");
              
              pageName = pageName.split("/").pop() || pageName;
              if (pageName === "page" || pageName === "index" || pageName === "") pageName = "Home";
              else pageName = pageName.charAt(0).toUpperCase() + pageName.slice(1);
              
              processedBlocks.push({
                  id: `page-${processedBlocks.length}`,
                  name: pageName.charAt(0).toUpperCase() + pageName.slice(1),
                  code: finalCode,
                  fallbackName,
                  isJS: !isHtml
              });
            }
          }
        } catch (e) {
          console.error("[Preview] JSON processing error:", e);
        }
      }

      // 2. If not a fullstack project, check if it's raw JS/JSX/TSX
      if (!isFullStack) {
          // Avoid matching metadata JSON (like dependencies) as JS
          const looksLikeJSON = rawCode.startsWith("{") || rawCode.startsWith("[");
          // Heuristic for JS: contains imports, exports, or React-like patterns
          const looksLikeJS = /import\s+|^export\s+|function\s+[A-Z]|const\s+[A-Z]|^class\s+|return\s*\(|<[A-Z][A-Za-z0-9]*[\s\/>]/.test(rawCode);
          
          if (looksLikeJS && !looksLikeJSON) {
              codeToProcess = rawCode;
              isJS = true;
              blockName = `Code Block ${processedBlocks.length + 1}`;
          } else if (rawCode.includes("<") && rawCode.includes(">") && !looksLikeJSON) {
              // HTML or simple JSX
              codeToProcess = rawCode;
              isJS = false;
              blockName = `HTML Preview ${processedBlocks.length + 1}`;
          }
      }

      if (!codeToProcess) continue;

      // Process imports and fallback names for JS blocks
      let finalCode = codeToProcess;
      let fallbackName = "";

      if (isJS) {
          // Process imports: convert lucide-react de-structuring to const { ... } = Lucide;
          finalCode = codeToProcess.replace(
            /import\s+\{\s*([^}]+)\s*\}\s+from\s+['"]lucide-react['"];?/g,
            "const { $1 } = Lucide;"
          );
          
          // Strip remaining imports
          finalCode = finalCode.replace(/import\s+[\s\S]*?from\s+['"][^'"]+['"];?/g, "");

          const topLevelSignatures = [...codeToProcess.matchAll(/^\s*(?:export\s+)?(?:default\s+)?(?:function|const|class|var|let)\s+(\w+)/gm)];
          const pascalCaseMatch = topLevelSignatures.find(m => /^[A-Z]/.test(m[1]));
          fallbackName = pascalCaseMatch ? pascalCaseMatch[1] : (topLevelSignatures.length > 0 ? topLevelSignatures[topLevelSignatures.length - 1][1] : "");

          if (fallbackName && !finalCode.match(/export\s+default/)) {
              finalCode += `\n\nexport default ${fallbackName};`;
          }
      }

      processedBlocks.push({
          id: `block-${processedBlocks.length}`,
          name: blockName || `Preview ${processedBlocks.length + 1}`,
          code: finalCode,
          fallbackName,
          isJS
      });
    }

    if (processedBlocks.length === 0) {
       // Only render as HTML if it's NOT JSON and has HTML tags
       const isJSON = content.trim().startsWith("{") || content.trim().startsWith("[");
       if (content.includes("<") && content.includes(">") && !isJSON) {
           processedBlocks.push({ id: 'block-0', name: 'Preview', code: content, fallbackName: "", isJS: false });
       } else {
           return new Response(`
            <div style="padding: 20px; font-family: sans-serif; text-align: center; color: #374151;">
                <h3 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 8px;">No Preview Available</h3>
                <p style="color: #6b7280; font-size: 0.875rem;">I couldn't find any code to preview in this message.</p>
                <div style="margin-top: 20px; padding: 12px; background: #f9fafb; border-radius: 6px; text-align: left;">
                    <p style="font-size: 12px; font-weight: 600; margin-bottom: 4px; color: #4b5563;">Why am I seeing this?</p>
                    <ul style="font-size: 12px; color: #6b7280; margin: 0; padding-left: 20px;">
                        <li>The generation might still be in progress.</li>
                        <li>The code might be in a format I don't recognize yet.</li>
                        <li>Try clicking the refresh button once the message is complete.</li>
                    </ul>
                </div>
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
        #preview-nav { 
            background: #1f2937; 
            color: #fff; 
            padding: 12px 16px; 
            display: flex; 
            gap: 8px; 
            border-bottom: 1px solid #374151; 
            overflow-x: auto; 
            flex-shrink: 0; 
            position: relative; 
            z-index: 9999;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .nav-btn { 
            background: #374151; 
            border: none; 
            color: #d1d5db; 
            padding: 8px 16px; 
            border-radius: 6px; 
            font-size: 13px; 
            font-weight: 500; 
            cursor: pointer; 
            white-space: nowrap;
            transition: all 0.2s;
        }
        .nav-btn:hover { background: #4b5563; color: #fff; }
        .nav-btn.active { background: #3b82f6; color: #fff; }
        #root-container { flex: 1; position: relative; overflow: auto; background: #fff; min-height: 0; z-index: 1; }
        #root { min-height: 100%; width: 100%; display: flex; flex-direction: column; }
        .error-box { padding: 20px; color: #ef4444; background: #fef2f2; border: 1px solid #fee2e2; border-radius: 8px; margin: 16px; }
        pre { font-family: monospace; font-size: 11px; white-space: pre-wrap; word-break: break-all; }
        #loading { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: #fff; z-index: 10; font-weight: 600; color: #666; }
        .page-indicator {
            font-size: 12px;
            color: #9ca3af;
            margin-left: auto;
            padding-right: 8px;
        }
    </style>
</head>
<body>
    <div id="loading">Initializing Preview...</div>
    
    ${processedBlocks.length > 0 ? `
    <div id="preview-nav">
        <span style="font-size: 13px; font-weight: 600; color: #9ca3af; margin-right: 8px; padding-top: 2px;">📄 Pages:</span>
        ${processedBlocks.map((b, i) => `
            <button class="nav-btn ${i === 0 ? 'active' : ''}" onclick="window.switchBlock('${b.id}')">${b.name}</button>
        `).join('')}
        <span class="page-indicator">${processedBlocks.length} page${processedBlocks.length > 1 ? 's' : ''}</span>
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

        // Next.js Mocks
        const Link = ({ href, children, className, ...props }) => (
            <a href={href} className={className} {...props} onClick={(e) => {
                if (href === "#" || href === "/") e.preventDefault();
            }}>
                {children}
            </a>
        );
        const Image = ({ src, alt, className, width, height, ...props }) => (
            <img src={src} alt={alt} className={className} width={width} height={height} {...props} />
        );
        const Head = () => null;
        const Suspense = ({ children }) => <>{children}</>;

        window.React = React;
        window.ReactDOM = ReactDOM;
        window.Lucide = Lucide;
        
        // Expose components globally for the eval scope
        window.Link = Link;
        window.Image = Image;
        window.Head = Head;
        window.Suspense = Suspense;
        window.SessionProvider = ({ children }) => <>{children}</>;
        
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
                
                var wrappedCode = "(function(React, Lucide, Link, Image, Suspense, SessionProvider) { " + 
                    "const exports = {}; " + 
                    "const module = { exports }; " + 
                    componentCode + "; " + 
                    "const primary = exports.default || exports.App || (typeof App !== 'undefined' ? App : null); " +
                    "if (primary) return primary; " + 
                    (block.fallbackName ? "if (typeof " + block.fallbackName + " !== 'undefined') return " + block.fallbackName + "; " : "") +
                    "return null; " +
                "})(window.React, window.Lucide, window.Link, window.Image, window.Suspense, window.SessionProvider)";
                
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
