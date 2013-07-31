using Stormancer.Core;
using Stormancer.Samples.SpaceRings.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Stormancer.Samples.SpaceRings
{
    public class Sync3dBehavior : Behavior<Scene>
    {
        #region Behavior
        protected override void OnAttached()
        {
            AssociatedObject.RegisterRoute<PositionUpdate>("move", MoveSent);

            AssociatedObject.OnConnect.Add(OnConnect);
            AssociatedObject.OnDisconnect.Add(OnDisconnect);
        }

        private Task MoveSent(RequestMessage<PositionUpdate> message)
        {
            var id = message.Connection.GetUserData<string>();
            var msg = message.Content;
            msg.UserId = id;

            return AssociatedObject.Broadcast("move", msg);
        }

        protected override void OnDetached()
        {
        }

        #endregion

        private async Task OnConnect(IConnection connection)
        {
            var userId = connection.GetUserData<string>();
            await connection.Send("User.Add", this.AssociatedObject.Connections
                .Where(con => con != connection)
                .Select(con => con.GetUserData<string>()).ToArray());

            await AssociatedObject.Broadcast("User.Add", new[] { userId });
        }

        private async Task OnDisconnect(IConnection connection)
        {
            var id = connection.GetUserData<string>();

            await AssociatedObject.Broadcast("User.Remove", id);
        }
    }
}
