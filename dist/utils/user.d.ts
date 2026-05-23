interface Default {
    default: string;
    name: string;
}
export interface Variables {
    defaults: Default[];
    user: Record<string, string>;
}
declare const User: (variables?: Variables) => Record<string, string>;
export default User;
