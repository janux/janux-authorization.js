interface Account{
	/** A unique name that identifies this Account - returns the same value as the getUsername inherited frmo the UserDetails interface */
	getName(): String
	setName(name: String ): void

	/** A password that can be used for password authentication */
	setPassword(password: String): void

	/** indicates whether the account is valid and can be used */
	setEnabled(enabled: boolean): void

	/** unlocks account */
	setAccountNonLocked(b: boolean): void

	/** if not null, the date of expiration of the account */
	getExpiration(): Date
	setExpiration(date: Date): void

	/** if not null, the date of expiration of the password */
	getPasswordExpiration(): Date
	setPasswordExpiration(date: Date): void

	/** The Roles that have been granted to this Account */
	getRoles(): Array<Role>
	setRoles(roles: Array<Role>): void

	/** This Account's settings, if any */
	getSettings(): Set<AccountSetting>
	setSettings(settings: Set<AccountSetting>): void
}

