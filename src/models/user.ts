import { DataTypes, Model, Optional } from 'sequelize';
import connection from '../db_config';

export interface UserAttributes {
  id: string;
  name: string;
  leagueName: string;
  puuid: string;
  lastUpdatedMatchId?: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

export type UserInput = Optional<UserAttributes, 'createdAt' | 'updatedAt' | 'deletedAt'>
export type UserOutput = Required<UserAttributes>

class User extends Model<UserAttributes, UserInput> implements UserAttributes {
	public id!: string;
	public name!: string;
	public leagueName!: string;
	public puuid!: string;
	public lastUpdatedMatchId!: string;

	public readonly createdAt!: Date;
	public readonly updatedAt!: Date;
	public readonly deletedAt!: Date;
}

User.init(
	{
		id: {
			type: DataTypes.UUID,
			defaultValue: DataTypes.UUIDV4,
			allowNull: false,
			primaryKey: true,
		},
		name: {
			type: DataTypes.STRING(128),
			allowNull: false,
		},
		puuid: {
			type: DataTypes.STRING(128),
			allowNull: false,
			unique: true,
		},
		lastUpdatedMatchId: {
			type: DataTypes.STRING(128),
		},
		leagueName: {
			type: DataTypes.STRING(128),
			allowNull: false,
			unique: true,
		},
	},
	{
		timestamps: true,
		sequelize: connection,
	},
);

export default User;
