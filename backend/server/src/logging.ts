type LogStream = (message: string) => void

export const createLogStream = <SubStreams extends {}>(colors: SubStreams) => {
	const subStreams = {} as { [k in keyof SubStreams]: LogStream }

	for (const subStream in colors) {
		subStreams[subStream] = (message: string) => `${colors[subStream]}: ${message}`
	}

	return subStreams
}
