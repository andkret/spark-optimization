import React from 'react';
import Editor from '@monaco-editor/react';

export default function CodePreview({ code }) {
  return (
    <Editor
      height="500px"
      defaultLanguage="python"
      value={code}
      theme="vs-dark"
      options={{
        readOnly: true,
        minimap: { enabled: false },
        fontSize: 14,
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        automaticLayout: true,
      }}
    />
  );
}
