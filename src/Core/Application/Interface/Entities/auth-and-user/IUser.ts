// User entity interface definition

export interface IUser{
    _id?:  string | null | undefined; // alternate type could be of type say uuid 
    first_name: string | null | undefined;
    last_name: string | null | undefined;
    email: string | null | undefined;
    password: string | null | undefined;
    profile_image: string | null | undefined; //url for user image
    status: string | null | undefined;
    isActive: boolean;
    user_secret: string | null | undefined;
    salt: string | null | undefined;
    refresh_token: string | null | undefined;
    last_login: string | null | undefined;
    roles: string[]; //Roles: "renter", "host" or both
    created_at: string | null | undefined;
    updated_at: string | null | undefined;
    __v: number;
}