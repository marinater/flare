import {
	Association,
	DataTypes,
	HasManyAddAssociationMixin,
	HasManyGetAssociationsMixin,
	HasManyRemoveAssociationMixin,
	Model,

	// Optional,
	Sequelize,
} from 'sequelize'
import { AppSettings } from '../server-utils'

// Connect to Postgres and stop server if connection failed
export const sequelize = new Sequelize(AppSettings.databaseURL)

sequelize
	.authenticate()
	.then(() =>
		console.log(
			`sequelize connected to database at ${AppSettings.databaseURL}`
		)
	)
	// .then(() => sequelize.sync({ force: true }))
	.catch((error) => {
		console.error(
			`sequelize could not connect to database at ${AppSettings.databaseURL}: ${error}`
		)
		process.exit(1)
	})

// These are all the attributes in the User model
interface UserAttributes {
	githubID: string
	discordID: string
}

export class User extends Model<UserAttributes> implements UserAttributes {
	// explicit fields
	public githubID!: string
	public discordID!: string

	// implicit timestamps!
	public readonly createdAt!: Date
	public readonly updatedAt!: Date

	// Since TS cannot determine model association at compile time
	// we have to declare them here purely virtually
	// these will not exist until `Model.init` was called.
	public getGuilds!: HasManyGetAssociationsMixin<Guild>
	public addGuild!: HasManyAddAssociationMixin<Guild, string>
	public removeGuild!: HasManyRemoveAssociationMixin<Guild, string>
	// public hasGuild!: HasManyHasAssociationMixin<Guild, number>
	// public countGuilds!: HasManyCountAssociationsMixin
	// public createGuild!: HasManyCreateAssociationMixin<Guild>

	// You can also pre-declare possible inclusions, these will only be populated if you
	// actively include a relation.
	public readonly guilds?: Guild[] // Note this is optional since it's only populated when explicitly requested in code

	public static associations: {
		guilds: Association<User, Guild>
	}
}

interface GuildAttributes {
	guildID: string
}

export class Guild extends Model<GuildAttributes> implements GuildAttributes {
	// explicit fields
	public guildID!: string

	// implicit timestamps!
	public readonly createdAt!: Date
	public readonly updatedAt!: Date

	// Since TS cannot determine model association at compile time
	// we have to declare them here purely virtually
	// these will not exist until `Model.init` was called.
	public getUsers!: HasManyGetAssociationsMixin<User>
	public addUser!: HasManyAddAssociationMixin<User, string>
	public removeUser!: HasManyRemoveAssociationMixin<User, string>
	// You can also pre-declare possible inclusions, these will only be populated if you
	// actively include a relation.
	public readonly Users?: User[] // Note this is optional since it's only populated when explicitly requested in code

	public static associations: {
		users: Association<Guild, User>
	}
}

User.init(
	{
		githubID: {
			type: DataTypes.STRING,
			allowNull: false,
			unique: true,
			primaryKey: true,
		},
		discordID: {
			type: DataTypes.STRING,
			allowNull: false,
			unique: true,
			primaryKey: true,
		},
	},
	{ sequelize }
)

Guild.init(
	{
		guildID: {
			type: DataTypes.STRING,
			allowNull: false,
			unique: true,
			primaryKey: true,
		},
	},
	{ sequelize }
)

Guild.belongsToMany(User, {
	through: 'guild_user',
	sourceKey: 'guildID',
	targetKey: 'discordID',
	onDelete: 'CASCADE',
	onUpdate: 'CASCADE',
})
User.belongsToMany(Guild, {
	through: 'guild_user',
	sourceKey: 'discordID',
	targetKey: 'guildID',
	onDelete: 'CASCADE',
	onUpdate: 'CASCADE',
})
