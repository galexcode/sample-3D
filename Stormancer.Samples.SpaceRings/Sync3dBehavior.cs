using Stormancer.Core;
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
            AssociatedObject.OnConnect.Add(OnConnect);
            AssociatedObject.OnDisconnect.Add(OnDisconnect);

            //AssociatedObject.RegisterRoute<string>("message", OnMessage);
            //AssociatedObject.RegisterApiRoute<string>("system", OnSystemMessage);
        }

        protected override void OnDetached()
        {
        }
        #endregion

        private async Task OnConnect(IConnection connection)
        {
        }

        private async Task OnDisconnect(IConnection connection)
        {
        }
    }
}
