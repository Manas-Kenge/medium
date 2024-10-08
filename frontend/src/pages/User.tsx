import { Appbar } from '../components/Appbar';
import { useParams } from 'react-router-dom';
import { UserProfile } from '../components/User/UserProfile';

export const User = () => {
    const { id } = useParams();
    return (
        <>
            <Appbar />
            <UserProfile id={id || ''} />
        </>
    );
};
