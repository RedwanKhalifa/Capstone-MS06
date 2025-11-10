-- Dijkstra's Algorithm to find the shortest path in a graph

function shortestPath(graph, startRoom, targetRoom, accessibleOnly):

    # Step 1: Initialize distances and previous nodes
    for each room in graph:
        distance[room] = infinity
        previous[room] = null
    distance[startRoom] = 0

    # Step 2: Create a priority queue (min-heap) of all rooms
    queue = all rooms in graph, prioritized by distance

    # Step 3: Explore nodes
    while queue is not empty:
        currentRoom = room in queue with smallest distance
        remove currentRoom from queue

        # If we reached the target, stop
        if currentRoom == targetRoom:
            break

        # Step 4: Check neighbors
        for each connection in currentRoom.connections:
            if accessibleOnly == true and connection.accessible == false:
                continue  # skip non-accessible connections

            neighbor = connection.toRoom
            newDist = distance[currentRoom] + connection.distance

            # Step 5: Relax edges
            if newDist < distance[neighbor]:
                distance[neighbor] = newDist
                previous[neighbor] = currentRoom
                update neighbor in queue with newDist

    # Step 6: Reconstruct path
    path = empty list
    current = targetRoom
    while current != null:
        insert current at beginning of path
        current = previous[current]

    return path, distance[targetRoom]

    