declare global {
	const tsvscode: {
		postMessage: ({ type: string, value: any }) => void
		getState: () => any
		setState: (state: any) => void
	}
	const gBaseURL: string
	const gSessionID: string
	const gDiscordID: string
}

export {}
