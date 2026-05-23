export declare const EMPTY_IMAGE_PLACEHOLDER: {
    type: string;
    url: string;
    alt: string;
    title: string;
    data: {
        hProperties: {};
    };
};
export declare const EMPTY_EMBED_PLACEHOLDER: {
    type: string;
    children: {
        type: string;
        url: string;
        title: string;
        children: {
            type: string;
            value: string;
        }[];
    }[];
    data: {
        hName: string;
        hProperties: {
            url: string;
            href: string;
            title: string;
        };
    };
};
export declare const EMPTY_RECIPE_PLACEHOLDER: {
    type: string;
    name: string;
    attributes: any[];
    children: any[];
};
export declare const EMPTY_CALLOUT_PLACEHOLDER: {
    type: string;
    name: string;
    attributes: {
        type: string;
        name: string;
        value: string;
    }[];
    children: {
        type: string;
        depth: number;
        children: {
            type: string;
            value: string;
        }[];
    }[];
};
export declare const EMPTY_TABLE_PLACEHOLDER: {
    type: string;
    align: string[];
    children: {
        type: string;
        children: {
            type: string;
            children: {
                type: string;
                value: string;
            }[];
        }[];
    }[];
};
export declare const EMPTY_CODE_PLACEHOLDER: {
    type: string;
    value: string;
    lang: any;
    meta: any;
};
