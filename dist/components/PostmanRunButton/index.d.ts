import React from 'react';
interface PostmanRunButtonProps {
    action: string;
    collectionId: string;
    collectionUrl: string;
    visibility: string;
}
declare const PostmanRunButton: ({ collectionId, collectionUrl, visibility, action, }: PostmanRunButtonProps) => React.JSX.Element;
export default PostmanRunButton;
