'use strict;';

let currentChannel = null;
let currentGuild = null;
let localMessageStorage = {};

const setActiveGuild = () => {
	document.querySelectorAll('.guild-active').forEach(elem => {
		if (elem.id !== `guild-${currentGuild.id}`) { elem.classList.remove('guild-active'); }
	});
	document.getElementById(`guild-${currentGuild.id}`).classList.add('guild-active');
};

const setActiveChannel = () => {
	document.querySelectorAll('.channel-container-active').forEach(elem => {
		if (elem.id !== `channel-${currentChannel.id}`) { elem.classList.remove('channel-container-active'); }
	});
	document.getElementById(`channel-${currentChannel.id}`).classList.add('channel-container-active');
};

const addNotificationDot = (type, id) => {
	if (currentGuild.id === `${type}-${id}` || currentChannel.id === `${type}-${id}`) return;
	
	const dotTemplate = `
		<span class='${type}-notification-dot'></span>
	`
	
	const dot = buildFromTemplate(dotTemplate, {});
	const unread = document.getElementById(`${type}-${id}`);

	unread.appendChild(dot);

	document.getElementById(`${type}-${id}`).classList.add(`${type}-container-notification`);
}

const removeNotificationDot = type => {
	let elements;

	if (type === 'channel') {
		localMessageStorage[currentGuild.id].channels[currentChannel.id].unread = false;

		const channel = document.getElementById(`channel-${currentChannel.id}`)
	
		channel.classList.remove('channel-container-notification');
		elements = channel.getElementsByClassName("channel-notification-dot");
	
	} else {
		localMessageStorage[currentGuild.id].unread = false;
		const guild = document.getElementById(`guild-${currentGuild.id}`)
	
		guild.classList.remove('guild-container-notification');
		elements = guild.getElementsByClassName("guild-notification-dot");
	}
	
	while (elements[0]) {
		elements[0].parentNode.removeChild(elements[0]);
	}
}

const buildFromTemplate = (template, templateValues) => {
	const container = document.createElement('div');
	container.innerHTML = template;

	for (let query in templateValues) {
		const elem = container.querySelector(query);
		elem.innerText = templateValues[query];
	}

	return container;
};

const createMessage = (message, displayHeader) => {
	const template = `
                <div class='message-container'>
                    <div class='message-avatar-container'>
                        <img class='message-avatar-img'>
                    </div>
                    <div class='message-data-container'>
                        <div class='message-info-row'>
                            <span class='message-info-author'></span>
                            <span class='message-info-timestamp'></span>
                        </div>
                        <div class='message-content-row'>
                        </div>
                        <div class="message-attachment-container">
                        </div>
                    </div>
                </div>
            `;

	const elem = buildFromTemplate(template, {
		'.message-info-author': message.author.name,
		'.message-info-timestamp': dayjs(message.timestamp).format('MM/DD/YY [at] h:mm A'),
		'.message-content-row': message.content,
	});

	if (displayHeader) {
		const avatar = elem.querySelector('.message-avatar-img');
		avatar.src = message.author.pfp;
		elem.querySelector('.message-container').style.paddingTop = '15px';
	} else {
		elem.querySelector('.message-avatar-container').style.height = 'initial';
		elem.querySelector('.message-avatar-img').remove();
		elem.querySelector('.message-info-row').remove();
	}

	const imageAttachmentTemplate = `
        <img class='message-attachment-image'/>
    `;

	const fileAttachmentTemplate = `
        <div class='message-attachment-file'>
            <a class='message-attachment-file-text'></a>
        </div>
    `;

	const attachmentContainer = elem.querySelector('.message-attachment-container');
	for (const attachment of message.attachments) {
		let attachmentElem;
		if (attachment.height === null || attachment.width === null) {
			attachmentElem = buildFromTemplate(fileAttachmentTemplate, { '.message-attachment-file-text': attachment.name || '(File attachment)' });
			const attachmentText = attachmentElem.querySelector('.message-attachment-file-text');
			attachmentText.href = attachment.url;
		}
		else {
			attachmentElem = buildFromTemplate(imageAttachmentTemplate, {});
			const attachmentText = attachmentElem.querySelector('.message-attachment-image');
			attachmentText.src = attachment.url;
			attachmentText.style.height = `${attachment.height}px`;
			attachmentText.style.width = `${attachment.width}px`;
		}

		attachmentContainer.appendChild(attachmentElem);
	}



	const messageList = document.getElementById('message-list');
	const messageListTail = document.getElementById('message-list-tail');

	messageList.insertBefore(elem, messageListTail);
	messageList.scrollTop = messageList.scrollHeight;
};

const setGuilds = () => {
	const container = document.getElementById('server-container');
	container.innerHTML = '';

	const template = `
                <div class='guild-container'>
                    <img class='guild-icon-img'>
                    <span class='guild-name-text'>
                    </span>
                </div>
            `;

	for (const guild of Object.values(localMessageStorage)) {
		const elem = buildFromTemplate(template, {
			'.guild-name-text': guild.name
				.split(' ')
				.map(x => (x ? x[0] : ''))
				.join(''),
		});

		if (!guild.icon) {
			elem.querySelector('.guild-icon-img').remove();
		} else {
			elem.querySelector('.guild-icon-img').src = guild.icon;
			elem.querySelector('.guild-name-text').remove();
		}

		const elemInner = elem.querySelector('.guild-container');
		elemInner.id = `guild-${guild.id}`;

		elemInner.onclick = () => {
			for (const channel of Object.values(localMessageStorage[currentGuild.id].channels)) {
				if (channel.unread) {
					currentGuild.unread = true
					addNotificationDot('guild', currentGuild.id);
					break;
				}
			}

			currentGuild = guild;
			const channelList = Object.values(guild.channels);
			currentChannel = channelList.length > 0 ? channelList[0] : null;

			setActiveGuild();
			removeNotificationDot('guild');
			setChannels();
			setChats();
		};
		container.appendChild(elem);
	}

	setActiveGuild();
};

const setChannels = () => {
	const container = document.getElementById('channels-container');
	container.innerHTML = '';

	const headerTemplate = `
                <div id='channels-header'>
                    TEXT CHANNELS
                </div>
    `;

	const header = buildFromTemplate(headerTemplate, {});
	container.appendChild(header);

	if (!currentGuild) { return; }

	const channelTemplate = `
                <div class='channel-container'>
                    <span class='channel-name-text'></span>
                </div>
    `;

	for (const channel of Object.values(currentGuild.channels)) {
		const elem = buildFromTemplate(channelTemplate, {
			'.channel-name-text': `# ${channel.name}`,
		});

		const channelContainer = elem.querySelector('.channel-container');
		channelContainer.id = `channel-${channel.id}`;

		channelContainer.onclick = () => {
			currentChannel = channel;

			setActiveChannel();
			removeNotificationDot('channel');
			document.getElementById('message-input').placeholder = `Message #${channel.name}`;
			setChats();
		};

		container.appendChild(elem);

		if (localMessageStorage[currentGuild.id].channels[channel.id].unread) {
			addNotificationDot('channel', channel.id);
		}
	}

	setActiveChannel();
};



const setChats = () => {
	document.getElementById('message-list').innerHTML = '<div id="message-list-tail"></div>';

	if (!currentChannel) { return; }

	let prevAuthor = null;
	for (const message of currentChannel.messages) {
		createMessage(message, message.author.id !== prevAuthor);

		prevAuthor = message.author.id;
	}
};

const inputField = document.getElementById('message-input');

inputField.onkeydown = event => {
	if (event.keyCode !== 13) { return; }
	if (!currentChannel && !currentGuild) {
		return;
	}

	document.getElementById('message-input');
	const retMessage = {
		channelID: currentChannel.id,
		guildID: currentGuild.id,
		content: inputField.value,
	};

	socket.emit('message-post', retMessage);
	inputField.value = '';
};

const handleMessage = data => {
	const guild = localMessageStorage[data.guildID];
	if (!guild) { return; }

	const channel = guild.channels[data.channelID];
	if (!channel) { return; }


	const messages = channel.messages;
	prevAuthor = messages.length > 0 ? messages[messages.length - 1].author.id : null;
	messages.push(data);

	if (currentChannel && data.channelID === currentChannel.id) {
		createMessage(data, data.author.id !== prevAuthor);
	} else {
		// Set all non-current channels unread to true
		localMessageStorage[data.guildID].channels[data.channelID].unread = true;

		if (currentGuild && data.guildID === currentGuild.id) {
			addNotificationDot('channel', data.channelID);
		} else {
			localMessageStorage[data.guildID].unread = true;
			addNotificationDot('guild', data.guildID);
		}
	}
};

socket.on('message-fetch', data => {
	console.log(data)
	localMessageStorage[currentGuild.id].channels[currentChannel.id].messages = [...data, ...localMessageStorage[currentGuild.id].channels[currentChannel.id].messages]
	setChats();

})
socket.on('forward-message', handleMessage);
socket.on('socket-init', data => {
	localMessageStorage = {};

	console.log(data);
	for (const guild of data.guilds) {
		localMessageStorage[guild.id] = {
			id: guild.id,
			name: guild.name,
			icon: guild.icon,
			unread: false,
			channels: {},
		};

		for (const channel of guild.channels) {
			localMessageStorage[guild.id].channels[channel.id] = {
				id: channel.id,
				name: channel.name,
				unread: false,
				messages: [],
			};
		}
	}

	const guildsList = Object.values(localMessageStorage);
	currentGuild = guildsList.length > 0 ? guildsList[0] : null;

	if (currentGuild) {
		const channelsList = Object.values(currentGuild.channels);
		currentChannel = channelsList.length > 0 ? channelsList[0] : null;
	}

	socket.emit('message-fetch', {guildID: currentGuild.id, channelID: currentChannel.id, limit: 20});

	setGuilds();
	setChannels();
	setChats();
});

socket.onAny((event) => {
	console.log(event);
});

socket.on('connect_error', err => {
	console.error(`connect_error: ${err.message}`);
});

socket.emit('socket-init', '');
