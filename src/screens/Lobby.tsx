import React, { useState, useEffect } from 'react';
import { connect } from 'react-redux';
import { Box, Text, Button, Flex } from 'theme-ui';

import { leaveRoom } from '../store/room/actions';
import { joinGame } from '../store/game/actions';
import { dbLeaveRoom, dbGetRoomRef } from '../firebase/rooms';
import { AppState } from '../store';
import { dbCreateGame, dbGetGameRef } from '../firebase/game';

interface LobbyProps {
    roomId: string | null;
    leaveRoom: typeof leaveRoom;
    joinGame: typeof joinGame;
}

const Lobby = (props: LobbyProps) => {
    const { roomId, joinGame } = props;
    const [userList, setUserList] = useState<Array<string>>([]);

    useEffect(() => {
        if (roomId == null) return;
        // IIFE to register listener for game start
        ((gameId: string) => {
            const gameRef = dbGetGameRef(gameId);
            gameRef.on('value', (snap) => {
                const snapVal = snap.val();

                if (snapVal == null) return;
                joinGame(gameId);
            });
        })(roomId);

        const roomRef = dbGetRoomRef(roomId);
        roomRef.on('value', (snap) => {
            const snapVal = snap.val();

            // firestore will update before redux sometimes so we don't want to try to read from snapVal yet
            if (snapVal == null) return;

            const data: Array<{ name: string }> = Object.values(snapVal);
            setUserList(data.map((u) => u.name));
        });
    }, [roomId, joinGame]);
    if (roomId == null)
        return (
            <Box>
                <Text>Not connected to a room!</Text>
            </Box>
        );

    const handleLeaveRoom = async () => {
        if (roomId == null) {
            console.error('Room ID not found');
            return;
        }
        props.leaveRoom();
        await dbLeaveRoom(roomId);
    };

    const handleCreateGame = async () => {
        const gameId = await dbCreateGame(roomId);
        if (gameId == null) return;
        props.joinGame(gameId);
    };

    return (
        <Box>
            <Button
                onClick={() => {
                    navigator.clipboard.writeText(roomId);
                }}
                variant="copy">
                {roomId}
            </Button>
            <Flex sx={{ flexDirection: 'column' }}>
                {userList.map((uname) => (
                    <Text key={uname}>{uname}</Text>
                ))}
            </Flex>
            <Button onClick={handleCreateGame}>Start Game</Button>
            <Button onClick={handleLeaveRoom}>Leave Room</Button>
        </Box>
    );
};

export default connect((state: AppState) => ({ roomId: state.rooms.roomId }), {
    leaveRoom,
    joinGame,
})(Lobby);
