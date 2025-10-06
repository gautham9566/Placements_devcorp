import React from 'react'

export default function DummyPage() {
	// Replace the src below with the URL or route you want to embed.
	const iframeSrc = 'https://en.wikipedia.org/wiki/M%26T_Bank'

	return (
		<div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 20}}>
			<h1>Embedded content</h1>
			<div style={{width: '100%', maxWidth: 100, aspectRatio: '16 / 9', boxShadow: '0 2px 8px rgba(0,0,0,0.15)'}}>
				<iframe
					src={iframeSrc}
					style={{width: '100%', height: '100%', border: '0'}}
					allowFullScreen
					sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
				/>
			</div>
			<p style={{marginTop: 12, color: '#666'}}>Change the iframe src in <code>dummy/page.jsx</code>.</p>
		</div>
	)
}
